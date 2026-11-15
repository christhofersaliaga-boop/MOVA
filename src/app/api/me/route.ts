import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getSessionUser } from "@/lib/server/auth";
import { toPublicUser } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const patch: Partial<typeof users.$inferInsert> = {};

  if (typeof body.name === "string") {
    const name = body.name.trim();
    if (name.length < 2) {
      return NextResponse.json({ error: "El nombre necesita al menos 2 letras." }, { status: 400 });
    }
    patch.name = name.slice(0, 40);
  }
  if (typeof body.avatar === "string") patch.avatar = body.avatar;
  if (typeof body.sedentaryMinutes === "number") {
    patch.sedentaryMinutes = Math.min(120, Math.max(10, Math.round(body.sedentaryMinutes)));
  }
  if (typeof body.notifyEnabled === "boolean") patch.notifyEnabled = body.notifyEnabled;
  if (typeof body.voiceEnabled === "boolean") patch.voiceEnabled = body.voiceEnabled;

  const [updated] = await db.update(users).set(patch).where(eq(users.id, user.id)).returning();
  return NextResponse.json({ user: toPublicUser(updated) });
}
