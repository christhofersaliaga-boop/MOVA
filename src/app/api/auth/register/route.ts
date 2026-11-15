import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { createSession, hashPassword } from "@/lib/server/auth";
import { seedStarterContent } from "@/lib/server/seed";
import { toPublicUser } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const name = String(body.name ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");

    if (name.length < 2) {
      return NextResponse.json({ error: "Cuéntanos tu nombre (mínimo 2 letras)." }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Ese correo no parece válido." }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "La contraseña necesita al menos 6 caracteres." }, { status: 400 });
    }

    const dup = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (dup.length > 0) {
      return NextResponse.json({ error: "Ya existe una cuenta con ese correo." }, { status: 409 });
    }

    const [user] = await db
      .insert(users)
      .values({ name, email, passwordHash: hashPassword(password) })
      .returning();

    await seedStarterContent(user.id);
    await createSession(user.id);

    return NextResponse.json({ user: toPublicUser(user) }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "No pudimos crear tu cuenta. Intenta de nuevo." }, { status: 500 });
  }
}
