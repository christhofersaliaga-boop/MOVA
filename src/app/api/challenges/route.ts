import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { challenges } from "@/db/schema";
import { todayKey } from "@/lib/dates";
import { getSessionUser } from "@/lib/server/auth";
import { ensureDailyChallenges } from "@/lib/server/game";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const url = new URL(req.url);
  const date = url.searchParams.get("date") ?? todayKey();

  await ensureDailyChallenges(user.id, user.xp);

  const rows = await db
    .select()
    .from(challenges)
    .where(and(eq(challenges.userId, user.id), eq(challenges.date, date)))
    .orderBy(challenges.id);

  return NextResponse.json({ challenges: rows });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const title = String(body.title ?? "").trim().slice(0, 80);
  const description = String(body.description ?? "").trim().slice(0, 200);
  const icon = String(body.icon ?? "Star");
  const target = Math.max(1, Math.min(50000, Math.round(Number(body.target ?? 1))));
  const unit = String(body.unit ?? "veces").trim().slice(0, 20) || "veces";
  const xp = Math.max(5, Math.min(200, Math.round(Number(body.xp ?? 20))));

  if (title.length < 3) {
    return NextResponse.json({ error: "Ponle un nombre a tu reto (mínimo 3 letras)." }, { status: 400 });
  }

  const [row] = await db
    .insert(challenges)
    .values({
      userId: user.id,
      title,
      description,
      icon,
      target,
      unit,
      xp,
      tier: "custom",
      date: todayKey(),
      generated: false,
    })
    .returning();

  return NextResponse.json({ challenge: row }, { status: 201 });
}
