import { NextResponse } from "next/server";
import { asc, desc, sql } from "drizzle-orm";
import { db } from "@/db";
import { activities, bodyMetrics, challenges, users } from "@/db/schema";
import { todayKey } from "@/lib/dates";
import { levelFromXp } from "@/lib/gamification";
import { requireAdmin } from "@/lib/server/admin";
import type { AdminUserDTO } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Solo administradores" }, { status: 403 });

  const [userRows, actAgg, chAgg, metricRows] = await Promise.all([
    db.select().from(users).orderBy(asc(users.createdAt)),
    db
      .select({
        userId: activities.userId,
        minutes: sql<number>`coalesce(sum(${activities.minutes}), 0)::int`,
        steps: sql<number>`coalesce(sum(${activities.steps}), 0)::int`,
        routines: sql<number>`count(*) filter (where ${activities.type} = 'routine')::int`,
        breaks: sql<number>`count(*) filter (where ${activities.type} in ('routine','stretch','challenge'))::int`,
        lastDate: sql<string | null>`max(${activities.date})`,
      })
      .from(activities)
      .groupBy(activities.userId),
    db
      .select({
        userId: challenges.userId,
        done: sql<number>`count(*) filter (where ${challenges.completed})::int`,
        total: sql<number>`count(*)::int`,
      })
      .from(challenges)
      .groupBy(challenges.userId),
    db.select().from(bodyMetrics).orderBy(desc(bodyMetrics.id)),
  ]);

  const actBy = new Map(actAgg.map((a) => [a.userId, a]));
  const chBy = new Map(chAgg.map((c) => [c.userId, c]));
  const metricBy = new Map<number, { bmi: number; weight: number }>();
  for (const m of metricRows) {
    if (!metricBy.has(m.userId)) metricBy.set(m.userId, { bmi: m.bmi, weight: m.weightKg });
  }

  const today = todayKey();
  const list: AdminUserDTO[] = userRows.map((u) => {
    const a = actBy.get(u.id);
    const c = chBy.get(u.id);
    const m = metricBy.get(u.id);
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      avatar: u.avatar,
      isAdmin: u.isAdmin,
      xp: u.xp,
      level: levelFromXp(u.xp).level,
      streak: u.streak,
      lastActiveDate: u.lastActiveDate,
      createdAt: u.createdAt.toISOString(),
      activeToday: u.lastActiveDate === today,
      totals: {
        minutes: Number(a?.minutes ?? 0),
        steps: Number(a?.steps ?? 0),
        routines: Number(a?.routines ?? 0),
        breaks: Number(a?.breaks ?? 0),
      },
      challengesDone: Number(c?.done ?? 0),
      challengesTotal: Number(c?.total ?? 0),
      latestBmi: m?.bmi ?? null,
      latestWeight: m?.weight ?? null,
    };
  });

  return NextResponse.json({ users: list });
}
