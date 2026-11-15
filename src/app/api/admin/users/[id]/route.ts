import { NextResponse } from "next/server";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  activities,
  bodyMetrics,
  challenges,
  reminders,
  scheduleBlocks,
  unlockedAvatars,
  users,
} from "@/db/schema";
import { addDays, labelFor, lastNDays, todayKey } from "@/lib/dates";
import { levelFromXp } from "@/lib/gamification";
import { requireAdmin } from "@/lib/server/admin";
import type { ActivityDTO, AdminUserDetailDTO, BodyMetricDTO } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Solo administradores" }, { status: 403 });

  const { id } = await params;
  const userId = Number(id);
  const [u] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!u) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  const weekAgo = addDays(todayKey(), -13);

  const [aggRows, chAgg, allActivities, metricRows, avatarRows, reminderRows, blockRows] =
    await Promise.all([
      db
        .select({
          minutes: sql<number>`coalesce(sum(${activities.minutes}), 0)::int`,
          steps: sql<number>`coalesce(sum(${activities.steps}), 0)::int`,
          routines: sql<number>`count(*) filter (where ${activities.type} = 'routine')::int`,
          breaks: sql<number>`count(*) filter (where ${activities.type} in ('routine','stretch','challenge'))::int`,
        })
        .from(activities)
        .where(eq(activities.userId, userId)),
      db
        .select({
          done: sql<number>`count(*) filter (where ${challenges.completed})::int`,
          total: sql<number>`count(*)::int`,
        })
        .from(challenges)
        .where(eq(challenges.userId, userId)),
      db
        .select()
        .from(activities)
        .where(and(eq(activities.userId, userId), gte(activities.date, weekAgo)))
        .orderBy(desc(activities.id)),
      db
        .select()
        .from(bodyMetrics)
        .where(eq(bodyMetrics.userId, userId))
        .orderBy(desc(bodyMetrics.id))
        .limit(12),
      db
        .select({ avatarId: unlockedAvatars.avatarId })
        .from(unlockedAvatars)
        .where(eq(unlockedAvatars.userId, userId)),
      db.select({ id: reminders.id }).from(reminders).where(eq(reminders.userId, userId)),
      db.select({ id: scheduleBlocks.id }).from(scheduleBlocks).where(eq(scheduleBlocks.userId, userId)),
    ]);

  const byDay = new Map<string, { minutes: number; steps: number }>();
  for (const a of allActivities) {
    const cur = byDay.get(a.date) ?? { minutes: 0, steps: 0 };
    cur.minutes += a.minutes;
    cur.steps += a.steps;
    byDay.set(a.date, cur);
  }

  const today = todayKey();
  const agg = aggRows[0];
  const c = chAgg[0];
  const latest = metricRows[0];

  const payload: AdminUserDetailDTO = {
    user: {
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
        minutes: Number(agg?.minutes ?? 0),
        steps: Number(agg?.steps ?? 0),
        routines: Number(agg?.routines ?? 0),
        breaks: Number(agg?.breaks ?? 0),
      },
      challengesDone: Number(c?.done ?? 0),
      challengesTotal: Number(c?.total ?? 0),
      latestBmi: latest?.bmi ?? null,
      latestWeight: latest?.weightKg ?? null,
    },
    daySeries: lastNDays(14).map((key) => ({
      key,
      label: labelFor(key),
      minutes: byDay.get(key)?.minutes ?? 0,
      steps: byDay.get(key)?.steps ?? 0,
    })),
    recent: allActivities.slice(0, 10).map(
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
    metrics: metricRows.map(
      (m): BodyMetricDTO => ({
        id: m.id,
        weightKg: m.weightKg,
        heightCm: m.heightCm,
        bmi: m.bmi,
        date: m.date,
      })
    ),
    avatars: avatarRows.map((r) => r.avatarId),
    remindersCount: reminderRows.length,
    blocksCount: blockRows.length,
  };

  return NextResponse.json(payload);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Solo administradores" }, { status: 403 });

  const { id } = await params;
  const userId = Number(id);
  if (userId === admin.id) {
    return NextResponse.json(
      { error: "No puedes eliminar tu propia cuenta de administrador." },
      { status: 400 }
    );
  }

  const [row] = await db.delete(users).where(eq(users.id, userId)).returning({ id: users.id });
  if (!row) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
