"use client";

import {
  BellRing,
  CircleUserRound,
  Dumbbell,
  Flame,
  HeartPulse,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
  Target,
  TrendingUp,
  Trophy,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { ReminderWatcher } from "@/components/reminder-watcher";
import { AvatarBubble, cx } from "@/components/ui";
import { levelFromXp } from "@/lib/gamification";
import type { PublicUser } from "@/lib/types";

const NAV = [
  { href: "/dashboard", label: "Panel", icon: LayoutDashboard },
  { href: "/retos", label: "Retos", icon: Target },
  { href: "/rutinas", label: "Rutinas", icon: Dumbbell },
  { href: "/imc", label: "Salud", icon: HeartPulse },
  { href: "/progreso", label: "Progreso", icon: TrendingUp },
  { href: "/recordatorios", label: "Avisos", icon: BellRing },
  { href: "/recompensas", label: "Premios", icon: Trophy },
  { href: "/admin", label: "Admin", icon: ShieldCheck, admin: true },
  { href: "/perfil", label: "Perfil", icon: CircleUserRound },
];

const MOBILE_NAV = [
  { href: "/dashboard", label: "Panel", icon: LayoutDashboard },
  { href: "/retos", label: "Retos", icon: Target },
  { href: "/rutinas", label: "Rutinas", icon: Dumbbell },
  { href: "/imc", label: "Salud", icon: HeartPulse },
  { href: "/recordatorios", label: "Avisos", icon: BellRing },
  { href: "/perfil", label: "Perfil", icon: CircleUserRound },
];

export function Logo({ compact }: { compact?: boolean }) {
  return (
    <Link href="/dashboard" className="press inline-flex items-center gap-2.5">
      <span className="flex size-9 items-center justify-center rounded-xl border-2 border-ink bg-limey shadow-pop-xs">
        <Zap className="size-5" strokeWidth={2.6} />
      </span>
      {!compact && (
        <span className="font-display text-2xl font-extrabold tracking-tight">
          Mova
          <span className="text-viola">.</span>
        </span>
      )}
    </Link>
  );
}

export function AppShell({ user, children }: { user: PublicUser; children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const { level } = levelFromXp(user.xp);

  // Sincroniza la preferencia de voz en la primera carga
  useEffect(() => {
    try {
      if (localStorage.getItem("mova:voice") === null) {
        localStorage.setItem("mova:voice", user.voiceEnabled ? "1" : "0");
      }
    } catch {}
  }, [user.voiceEnabled]);

  async function logout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <div className="bg-dots min-h-dvh">
      {/* ---------- Sidebar escritorio ---------- */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[248px] flex-col border-r-2 border-ink bg-paper px-4 py-6 lg:flex">
        <Logo />
        <nav className="mt-8 flex flex-col gap-1.5">
          {NAV.filter((item) => !("admin" in item && item.admin) || user.isAdmin).map((item) => {
            const active = pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cx(
                  "press flex items-center gap-3 rounded-xl border-2 px-3.5 py-2.5 font-display text-[15px] font-bold transition-colors",
                  active
                    ? "border-ink bg-ink text-paper shadow-pop-xs"
                    : "border-transparent text-ink hover:border-ink hover:bg-white hover:shadow-pop-xs"
                )}
              >
                <Icon className="size-[18px]" strokeWidth={2.4} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto space-y-3">
          <div className="rounded-2xl border-2 border-ink bg-white p-3.5 shadow-pop-sm">
            <div className="flex items-center gap-2.5">
              <AvatarBubble id={user.avatar} size={40} />
              <div className="min-w-0">
                <p className="truncate font-display text-sm font-extrabold">{user.name}</p>
                <p className="text-xs font-bold text-viola">Nivel {level}</p>
              </div>
            </div>
            <div className="mt-2.5 flex items-center gap-1.5 text-xs font-bold">
              <Flame className="size-4 text-coral" strokeWidth={2.5} />
              {user.streak} días de racha
            </div>
          </div>
          <button
            onClick={logout}
            disabled={loggingOut}
            className="press flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-ink bg-white px-3 py-2 font-display text-sm font-bold hover:bg-rosy/30 disabled:opacity-50"
          >
            <LogOut className="size-4" />
            {loggingOut ? "Saliendo…" : "Cerrar sesión"}
          </button>
        </div>
      </aside>

      {/* ---------- Header móvil ---------- */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b-2 border-ink bg-paper/90 px-4 py-3 backdrop-blur lg:hidden">
        <Logo />
        <Link href="/perfil" className="press" aria-label="Perfil">
          <AvatarBubble id={user.avatar} size={38} />
        </Link>
      </header>

      {/* ---------- Contenido ---------- */}
      <div className="lg:pl-[248px]">
        <main className="mx-auto w-full max-w-5xl px-4 pb-32 pt-5 sm:px-6 lg:pb-12 lg:pt-8">
          {children}
        </main>
      </div>

      {/* ---------- Bottom nav móvil ---------- */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-ink bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-md items-end justify-around px-2 pt-1.5">
          {MOBILE_NAV.map((item) => {
            const active = pathname.startsWith(item.href);
            const Icon = item.icon;
            if (item.href === "/rutinas") {
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="press -mt-6 flex flex-col items-center"
                  aria-label="Rutinas"
                >
                  <span
                    className={cx(
                      "flex size-14 items-center justify-center rounded-2xl border-2 border-ink shadow-pop transition-colors",
                      active ? "bg-limey" : "bg-viola text-white"
                    )}
                  >
                    <Icon className="size-6" strokeWidth={2.4} />
                  </span>
                  <span className="mt-1 pb-1.5 text-[10px] font-bold uppercase tracking-wide text-ink-soft">
                    {item.label}
                  </span>
                </Link>
              );
            }
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cx(
                  "press flex flex-col items-center rounded-xl px-3 py-1.5",
                  active ? "text-ink" : "text-ink-soft"
                )}
              >
                <span
                  className={cx(
                    "flex size-9 items-center justify-center rounded-xl border-2 transition-colors",
                    active
                      ? "border-ink bg-limey shadow-pop-xs"
                      : "border-transparent"
                  )}
                >
                  <Icon className="size-5" strokeWidth={2.4} />
                </span>
                <span className="mt-0.5 text-[10px] font-bold uppercase tracking-wide">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      <ReminderWatcher user={user} />
    </div>
  );
}
