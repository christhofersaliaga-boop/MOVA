import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { reminders } from "@/db/schema";
import { getSessionUser } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

const KINDS = new Set(["break", "water", "posture", "custom"]);

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const rows = await db
    .select()
    .from(reminders)
    .where(eq(reminders.userId, user.id))
    .orderBy(reminders.time, reminders.id);

  return NextResponse.json({ reminders: rows });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const title = String(body.title ?? "").trim().slice(0, 60);
  const time = String(body.time ?? "");
  const kind = KINDS.has(body.kind) ? body.kind : "custom";
  const days: number[] = Array.isArray(body.days)
    ? Array.from(
        new Set<number>(
          (body.days as unknown[]).map(Number).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6)
        )
      ).sort((a, b) => a - b)
    : [];

  if (title.length < 2) {
    return NextResponse.json({ error: "Ponle un nombre a tu recordatorio." }, { status: 400 });
  }
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
    return NextResponse.json({ error: "Elige una hora válida." }, { status: 400 });
  }
  if (days.length === 0) {
    return NextResponse.json({ error: "Elige al menos un día de la semana." }, { status: 400 });
  }

  const [row] = await db
    .insert(reminders)
    .values({ userId: user.id, title, time, days, kind, enabled: true })
    .returning();

  return NextResponse.json({ reminder: row }, { status: 201 });
}
