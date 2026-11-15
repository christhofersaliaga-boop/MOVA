import { NextResponse } from "next/server";
import { and, desc, eq, gte, sum } from "drizzle-orm";
import { db } from "@/db";
import { activities, challenges, unlockedAvatars } from "@/db/schema";
import { addDays, labelFor, lastNDays, todayKey } from "@/lib/dates";
import { levelFromXp } from "@/lib/gamification";
import { getSessionUser } from "@/lib/server/auth";
import { ensureDailyChallenges } from "@/lib/server/game";
import { toPublicUser, type ActivityDTO, type ChallengeDTO, type StatsResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  await ensureDailyChallenges(user.id, user.xp);

  const today = todayKey();
  const weekStart = addDays(today, -6);

  const [todayRows, weekRows, challengeRows, recentRows, totalRows, avatarRows] =
    await Promise.all([
      db.select().from(activities).where(and(eq(activities.userId, user.id), eq(activities.date, today))),
      db.select().from(activities).where(and(eq(activities.userId, user.id), gte(activities.date, weekStart))),
      db.select().from(challenges).where(and(eq(challenges.userId, user.id), eq(challenges.date, today))).orderBy(challenges.id),
      db.select().from(activities).where(eq(activities.userId, user.id)).orderBy(desc(activities.id)).limit(6),
      db
        .select({
          minutes: sum(activities.minutes),
          steps: sum(activities.steps),
        })
        .from(activities)
        .where(eq(activities.userId, user.id)),
      db.select({ avatarId: unlockedAvatars.avatarId }).from(unlockedAvatars).where(eq(unlockedAvatars.userId, user.id)),
    ]);

  const todayAgg = { minutes: 0, steps: 0, breaks: 0, xp: 0 };
  for (const a of todayRows) {
    todayAgg.minutes += a.minutes;
    todayAgg.steps += a.steps;
    todayAgg.xp += a.xp;
    if (["routine", "stretch", "challenge"].includes(a.type)) todayAgg.breaks += 1;
  }

  const byDay = new Map<string, { minutes: number; steps: number }>();
  for (const a of weekRows) {
    const cur = byDay.get(a.date) ?? { minutes: 0, steps: 0 };
    cur.minutes += a.minutes;
    cur.steps += a.steps;
    byDay.set(a.date, cur);
  }
  const week = lastNDays(7).map((key) => ({
    key,
    label: labelFor(key),
    minutes: byDay.get(key)?.minutes ?? 0,
    steps: byDay.get(key)?.steps ?? 0,
  }));

  const routinesTotal = await db
    .select({ id: activities.id })
    .from(activities)
    .where(and(eq(activities.userId, user.id), eq(activities.type, "routine")));

  const { level, into, needed } = levelFromXp(user.xp);

  const payload: StatsResponse = {
    user: { ...toPublicUser(user), level, into, needed },
    today: todayAgg,
    week,
    challenges: challengeRows.map(
      (c): ChallengeDTO => ({
        id: c.id,
        title: c.title,
        description: c.description,
        icon: c.icon,
        target: c.target,
        progress: c.progress,
        unit: c.unit,
        xp: c.xp,
        tier: c.tier,
        date: c.date,
        completed: c.completed,
        generated: c.generated,
      })
    ),
    recent: recentRows.map(
      (a): ActivityDTO => ({
        id: a.id,
        type: a.type,
        title: a.title,
        minutes: a.minutes,
        steps: a.steps,
        xp: a.xp,
        date: a.date,
      })
    ),
    totals: {
      minutes: Number(totalRows[0]?.minutes ?? 0),
      steps: Number(totalRows[0]?.steps ?? 0),
      routines: routinesTotal.length,
    },
    unlockedAvatars: avatarRows.map((r) => r.avatarId),
  };

  return NextResponse.json(payload);
}
