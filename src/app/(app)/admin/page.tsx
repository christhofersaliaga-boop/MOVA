import { redirect } from "next/navigation";
import { AdminView } from "@/components/admin-view";
import { getSessionUser } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!user.isAdmin) redirect("/dashboard");
  return <AdminView adminId={user.id} />;
}
