import { NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { challenges, users } from "@/db/schema";
import { getSessionUser } from "@/lib/server/auth";
import { addXpAndTouch } from "@/lib/server/game";
import { levelFromXp } from "@/lib/gamification";

export const dynamic = "force-dynamic";

async function loadOwned(userId: number, id: number) {
  const [row] = await db
    .select()
    .from(challenges)
    .where(and(eq(challenges.id, id), eq(challenges.userId, userId)))
    .limit(1);
  return row ?? null;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const row = await loadOwned(user.id, Number(id));
  if (!row) return NextResponse.json({ error: "Reto no encontrado" }, { status: 404 });

  const body = await req.json();
  const op = String(body.op ?? "increment");

  let progress = row.progress;
  if (op === "increment") {
    const amount = Math.max(1, Math.round(Number(body.amount ?? 1)));
    progress = Math.min(row.target, progress + amount);
  } else if (op === "set") {
    progress = Math.max(0, Math.min(row.target, Math.round(Number(body.value ?? 0))));
  } else if (op === "reset") {
    progress = 0;
  }

  const wasCompleted = row.completed;
  const completed = progress >= row.target;

  const [updated] = await db
    .update(challenges)
    .set({ progress, completed })
    .where(eq(challenges.id, row.id))
    .returning();

  let game: { xp: number; level: number; into: number; needed: number; streak?: number } | null = null;
  if (completed && !wasCompleted) {
    game = await addXpAndTouch(user.id, row.xp);
  } else if (!completed && wasCompleted) {
    const [u] = await db
      .update(users)
      .set({ xp: sql`greatest(0, ${users.xp} - ${row.xp})` })
      .where(eq(users.id, user.id))
      .returning({ xp: users.xp });
    const { level, into, needed } = levelFromXp(u.xp);
    game = { xp: u.xp, level, into, needed };
  }

  return NextResponse.json({ challenge: updated, game });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const [row] = await db
    .delete(challenges)
    .where(and(eq(challenges.id, Number(id)), eq(challenges.userId, user.id)))
    .returning({ id: challenges.id });
  if (!row) return NextResponse.json({ error: "Reto no encontrado" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
