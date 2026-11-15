import type { User } from "@/db/schema";
import { getSessionUser } from "@/lib/server/auth";

// Devuelve el usuario solo si es administrador; si no, null
export async function requireAdmin(): Promise<User | null> {
  const user = await getSessionUser();
  if (!user || !user.isAdmin) return null;
  return user;
}
