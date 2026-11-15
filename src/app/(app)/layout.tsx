import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { ToasterProvider } from "@/components/toaster";
import { getSessionUser } from "@/lib/server/auth";
import { toPublicUser } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <ToasterProvider>
      <AppShell user={toPublicUser(user)}>{children}</AppShell>
    </ToasterProvider>
  );
}
