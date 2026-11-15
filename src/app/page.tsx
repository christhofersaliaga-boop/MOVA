import { redirect } from "next/navigation";
import { Landing } from "@/components/landing";
import { getSessionUser } from "@/lib/server/auth";
import { ensureDemoAccount } from "@/lib/server/seed";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [user] = await Promise.all([getSessionUser(), ensureDemoAccount()]);
  if (user) redirect("/dashboard");
  return <Landing />;
}
