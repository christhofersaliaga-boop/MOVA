import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { bodyMetrics } from "@/db/schema";
import { getSessionUser } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const [row] = await db
    .delete(bodyMetrics)
    .where(and(eq(bodyMetrics.id, Number(id)), eq(bodyMetrics.userId, user.id)))
    .returning({ id: bodyMetrics.id });

  if (!row) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
