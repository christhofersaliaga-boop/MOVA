import { redirect } from "next/navigation";
import { PerfilView } from "@/components/perfil-view";
import { getSessionUser } from "@/lib/server/auth";
import { toPublicUser } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function PerfilPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return <PerfilView user={toPublicUser(user)} />;
}
