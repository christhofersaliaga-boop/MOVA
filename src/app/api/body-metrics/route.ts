import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { activities, bodyMetrics } from "@/db/schema";
import { todayKey } from "@/lib/dates";
import { getSessionUser } from "@/lib/server/auth";
import { addXpAndTouch } from "@/lib/server/game";
import type { BodyMetricDTO } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const rows = await db
    .select()
    .from(bodyMetrics)
    .where(eq(bodyMetrics.userId, user.id))
    .orderBy(desc(bodyMetrics.id))
    .limit(60);

  const metrics: BodyMetricDTO[] = rows.map((m) => ({
    id: m.id,
    weightKg: m.weightKg,
    heightCm: m.heightCm,
    bmi: m.bmi,
    date: m.date,
  }));

  return NextResponse.json({ metrics });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const weightKg = Math.round(Number(body.weightKg) * 10) / 10;
  const heightCm = Math.round(Number(body.heightCm));

  if (!(weightKg >= 25 && weightKg <= 400)) {
    return NextResponse.json({ error: "Revisa el peso: debe estar entre 25 y 400 kg." }, { status: 400 });
  }
  if (!(heightCm >= 100 && heightCm <= 230)) {
    return NextResponse.json({ error: "Revisa la talla: debe estar entre 100 y 230 cm." }, { status: 400 });
  }

  const meters = heightCm / 100;
  const bmi = Math.round((weightKg / (meters * meters)) * 10) / 10;
  const xp = 10;

  const [row] = await db
    .insert(bodyMetrics)
    .values({ userId: user.id, weightKg, heightCm, bmi, date: todayKey() })
    .returning();

  await db.insert(activities).values({
    userId: user.id,
    type: "metric",
    title: "Medición corporal registrada",
    minutes: 0,
    steps: 0,
    xp,
    date: todayKey(),
  });

  const game = await addXpAndTouch(user.id, xp);

  return NextResponse.json(
    {
      metric: { id: row.id, weightKg: row.weightKg, heightCm: row.heightCm, bmi: row.bmi, date: row.date },
      game,
    },
    { status: 201 }
  );
}
