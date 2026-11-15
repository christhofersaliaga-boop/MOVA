import { NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { activities, users } from "@/db/schema";
import { getSessionUser } from "@/lib/server/auth";
import { levelFromXp } from "@/lib/gamification";

export const dynamic = "force-dynamic";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const activityId = Number(id);

  const [row] = await db
    .delete(activities)
    .where(and(eq(activities.id, activityId), eq(activities.userId, user.id)))
    .returning();
  if (!row) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  // revertir xp otorgado (sin bajar de 0)
  const [updated] = await db
    .update(users)
    .set({ xp: sql`greatest(0, ${users.xp} - ${row.xp})` })
    .where(eq(users.id, user.id))
    .returning({ xp: users.xp });

  const { level, into, needed } = levelFromXp(updated.xp);
  return NextResponse.json({ ok: true, game: { xp: updated.xp, level, into, needed } });
}
