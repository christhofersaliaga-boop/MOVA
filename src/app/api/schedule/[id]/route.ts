import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { scheduleBlocks } from "@/db/schema";
import { getSessionUser } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const patch: Partial<typeof scheduleBlocks.$inferInsert> = {};

  if (typeof body.title === "string") {
    const title = body.title.trim().slice(0, 60);
    if (title.length < 2) return NextResponse.json({ error: "Nombre muy corto." }, { status: 400 });
    patch.title = title;
  }
  if (body.day !== undefined) {
    const day = Number(body.day);
    if (!(day >= 0 && day <= 6)) return NextResponse.json({ error: "Día inválido." }, { status: 400 });
    patch.day = day;
  }
  if (typeof body.startTime === "string") {
    if (!HHMM.test(body.startTime)) return NextResponse.json({ error: "Hora inválida." }, { status: 400 });
    patch.startTime = body.startTime;
  }
  if (typeof body.endTime === "string") {
    if (!HHMM.test(body.endTime)) return NextResponse.json({ error: "Hora inválida." }, { status: 400 });
    patch.endTime = body.endTime;
  }
  if (typeof body.location === "string") patch.location = body.location.trim().slice(0, 60) || null;
  if (typeof body.color === "string") patch.color = body.color;

  const [row] = await db
    .update(scheduleBlocks)
    .set(patch)
    .where(and(eq(scheduleBlocks.id, Number(id)), eq(scheduleBlocks.userId, user.id)))
    .returning();
  if (!row) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  if (row.startTime >= row.endTime) {
    return NextResponse.json({ error: "El inicio debe ser antes del fin." }, { status: 400 });
  }
  return NextResponse.json({ block: row });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;
  const [row] = await db
    .delete(scheduleBlocks)
    .where(and(eq(scheduleBlocks.id, Number(id)), eq(scheduleBlocks.userId, user.id)))
    .returning({ id: scheduleBlocks.id });
  if (!row) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
