import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { scheduleBlocks } from "@/db/schema";
import { getSessionUser } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const rows = await db
    .select()
    .from(scheduleBlocks)
    .where(eq(scheduleBlocks.userId, user.id))
    .orderBy(asc(scheduleBlocks.day), asc(scheduleBlocks.startTime));

  return NextResponse.json({ blocks: rows });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const title = String(body.title ?? "").trim().slice(0, 60);
  const day = Number(body.day);
  const startTime = String(body.startTime ?? "");
  const endTime = String(body.endTime ?? "");
  const location = String(body.location ?? "").trim().slice(0, 60) || null;
  const color = String(body.color ?? "#7C6CFF");

  if (title.length < 2) return NextResponse.json({ error: "Nombra tu clase o bloque." }, { status: 400 });
  if (!(day >= 0 && day <= 6)) return NextResponse.json({ error: "Día inválido." }, { status: 400 });
  if (!HHMM.test(startTime) || !HHMM.test(endTime) || startTime >= endTime) {
    return NextResponse.json({ error: "Revisa las horas: el inicio debe ser antes del fin." }, { status: 400 });
  }

  const [row] = await db
    .insert(scheduleBlocks)
    .values({ userId: user.id, title, day, startTime, endTime, location, color })
    .returning();

  return NextResponse.json({ block: row }, { status: 201 });
}
