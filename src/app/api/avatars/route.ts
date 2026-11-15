import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { unlockedAvatars } from "@/db/schema";
import { avatarById } from "@/lib/avatars";
import { levelFromXp } from "@/lib/gamification";
import { getSessionUser } from "@/lib/server/auth";
import { toPublicUser } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const rows = await db
    .select({ avatarId: unlockedAvatars.avatarId })
    .from(unlockedAvatars)
    .where(eq(unlockedAvatars.userId, user.id));
  const { level, into, needed } = levelFromXp(user.xp);
  return NextResponse.json({
    unlocked: rows.map((r) => r.avatarId),
    user: { ...toPublicUser(user), level, into, needed },
  });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const avatarId = String(body.avatarId ?? "");
  const def = avatarById(avatarId);
  if (def.id !== avatarId) {
    return NextResponse.json({ error: "Avatar desconocido." }, { status: 404 });
  }

  const { level } = levelFromXp(user.xp);
  if (def.level > level) {
    return NextResponse.json(
      { error: `Necesitas nivel ${def.level}. Vas en nivel ${level}, ¡casi!` },
      { status: 403 }
    );
  }

  const existing = await db
    .select({ id: unlockedAvatars.id })
    .from(unlockedAvatars)
    .where(and(eq(unlockedAvatars.userId, user.id), eq(unlockedAvatars.avatarId, avatarId)))
    .limit(1);
  if (existing.length === 0) {
    await db.insert(unlockedAvatars).values({ userId: user.id, avatarId });
  }

  const rows = await db
    .select({ avatarId: unlockedAvatars.avatarId })
    .from(unlockedAvatars)
    .where(eq(unlockedAvatars.userId, user.id));
  return NextResponse.json({ unlocked: rows.map((r) => r.avatarId) });
}
