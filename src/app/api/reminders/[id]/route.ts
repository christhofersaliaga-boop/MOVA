import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { reminders } from "@/db/schema";
import { getSessionUser } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

const KINDS = new Set(["break", "water", "posture", "custom"]);

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const patch: Partial<typeof reminders.$inferInsert> = {};

  if (typeof body.title === "string") {
    const title = body.title.trim().slice(0, 60);
    if (title.length < 2) return NextResponse.json({ error: "Nombre muy corto." }, { status: 400 });
    patch.title = title;
  }
  if (typeof body.time === "string") {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(body.time)) {
      return NextResponse.json({ error: "Hora inválida." }, { status: 400 });
    }
    patch.time = body.time;
  }
  if (Array.isArray(body.days)) {
    const days: number[] = Array.from(
      new Set<number>(
        (body.days as unknown[]).map(Number).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6)
      )
    ).sort((a, b) => a - b);
    if (days.length === 0) return NextResponse.json({ error: "Elige al menos un día." }, { status: 400 });
    patch.days = days;
  }
  if (typeof body.enabled === "boolean") patch.enabled = body.enabled;
  if (KINDS.has(body.kind)) patch.kind = body.kind;

  const [row] = await db
    .update(reminders)
    .set(patch)
    .where(and(eq(reminders.id, Number(id)), eq(reminders.userId, user.id)))
    .returning();
  if (!row) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  return NextResponse.json({ reminder: row });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;
  const [row] = await db
    .delete(reminders)
    .where(and(eq(reminders.id, Number(id)), eq(reminders.userId, user.id)))
    .returning({ id: reminders.id });
  if (!row) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
