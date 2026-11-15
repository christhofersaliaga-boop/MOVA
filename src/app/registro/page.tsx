import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { getSessionUser } from "@/lib/server/auth";
import { Zap } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  const user = await getSessionUser();
  if (user) redirect("/dashboard");

  return (
    <div className="bg-grid flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="flex size-12 -rotate-3 items-center justify-center rounded-2xl border-2 border-ink bg-rosy shadow-pop">
            <Zap className="size-6" strokeWidth={2.6} />
          </span>
          <h1 className="mt-4 font-display text-3xl font-extrabold tracking-tight">
            Crea tu cuenta
          </h1>
          <p className="mt-1 text-sm font-medium text-ink-soft">
            30 segundos y tu primer reto te espera.
          </p>
        </div>
        <div className="rounded-3xl border-2 border-ink bg-white p-6 shadow-pop-lg">
          <AuthForm mode="register" />
        </div>
      </div>
    </div>
  );
}
