import { NextResponse } from "next/server";
import { and, desc, eq, gte } from "drizzle-orm";
import { db } from "@/db";
import { activities } from "@/db/schema";
import { addDays, todayKey } from "@/lib/dates";
import { XP } from "@/lib/gamification";
import { getSessionUser } from "@/lib/server/auth";
import { addXpAndTouch } from "@/lib/server/game";

export const dynamic = "force-dynamic";

const TYPE_META: Record<string, { iconTitle: string; xp: (m: number, s: number) => number }> = {
  walk: { iconTitle: "Caminata", xp: (m) => m * XP.walkMinute },
  stretch: { iconTitle: "Estiramiento", xp: (m) => m * XP.stretchMinute },
  steps: { iconTitle: "Pasos", xp: (m, s) => Math.round((s / 100) * XP.perHundredSteps) },
  custom: { iconTitle: "Actividad", xp: (m) => m * 3 },
};

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const url = new URL(req.url);
  const days = Math.min(120, Math.max(1, Number(url.searchParams.get("days") ?? "30")));
  const from = addDays(todayKey(), -(days - 1));

  const rows = await db
    .select()
    .from(activities)
    .where(and(eq(activities.userId, user.id), gte(activities.date, from)))
    .orderBy(desc(activities.date), desc(activities.id));

  return NextResponse.json({
    activities: rows.map((a) => ({
      id: a.id,
      type: a.type,
      title: a.title,
      minutes: a.minutes,
      steps: a.steps,
      xp: a.xp,
      date: a.date,
    })),
  });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const type = String(body.type ?? "custom");
  const title = String(body.title ?? TYPE_META[type]?.iconTitle ?? "Actividad").trim().slice(0, 80);
  const minutes = Math.max(0, Math.min(600, Math.round(Number(body.minutes ?? 0))));
  const steps = Math.max(0, Math.min(100000, Math.round(Number(body.steps ?? 0))));

  if (!title || (minutes === 0 && steps === 0)) {
    return NextResponse.json({ error: "Agrega minutos o pasos para registrar." }, { status: 400 });
  }

  const meta = TYPE_META[type] ?? TYPE_META.custom;
  const xp = typeof body.xp === "number" ? Math.max(0, Math.round(body.xp)) : meta.xp(minutes, steps);

  const [row] = await db
    .insert(activities)
    .values({ userId: user.id, type, title, minutes, steps, xp, date: todayKey() })
    .returning();

  const game = await addXpAndTouch(user.id, xp);

  return NextResponse.json(
    {
      activity: {
        id: row.id,
        type: row.type,
        title: row.title,
        minutes: row.minutes,
        steps: row.steps,
        xp: row.xp,
        date: row.date,
      },
      game,
    },
    { status: 201 }
  );
}
