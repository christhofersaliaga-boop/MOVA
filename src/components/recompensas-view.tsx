"use client";

import { motion } from "framer-motion";
import { Check, Flame, Lock, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/toaster";
import { AvatarBubble, Button, Card, Chip, ProgressBar, Skeleton, cx } from "@/components/ui";
import { AVATARS } from "@/lib/avatars";
import { api } from "@/lib/client/api";
import { iconByName } from "@/lib/icons";
import type { PublicUser, StatsResponse } from "@/lib/types";

type AvatarsPayload = {
  unlocked: string[];
  user: PublicUser & { level: number; into: number; needed: number };
};

const ACHIEVEMENTS: {
  icon: string;
  color: string;
  name: string;
  desc: string;
  test: (t: StatsResponse["totals"], streak: number) => boolean;
}[] = [
  { icon: "Star", color: "#C9F24F", name: "Primer paso", desc: "Registra tu primer movimiento", test: (t) => t.minutes > 0 || t.steps > 0 },
  { icon: "Flame", color: "#FFC84D", name: "Racha encendida", desc: "3 días seguidos moviéndote", test: (_t, s) => s >= 3 },
  { icon: "Flame", color: "#FF7461", name: "Semana de fuego", desc: "7 días de racha", test: (_t, s) => s >= 7 },
  { icon: "Footprints", color: "#6FD6FF", name: "Caminante", desc: "10,000 pasos acumulados", test: (t) => t.steps >= 10000 },
  { icon: "Footprints", color: "#7C6CFF", name: "Maratón mini", desc: "50,000 pasos acumulados", test: (t) => t.steps >= 50000 },
  { icon: "Dumbbell", color: "#B9A8FF", name: "Fan de las minis", desc: "5 micro-rutinas completadas", test: (t) => t.routines >= 5 },
  { icon: "Dumbbell", color: "#FFA9D6", name: "Máquina de rutinas", desc: "20 micro-rutinas completadas", test: (t) => t.routines >= 20 },
  { icon: "Timer", color: "#8FE388", name: "Hora pico", desc: "300 minutos activos acumulados", test: (t) => t.minutes >= 300 },
];

export function RecompensasView() {
  const toast = useToast();
  const router = useRouter();
  const [data, setData] = useState<AvatarsPayload | null>(null);
  const [totals, setTotals] = useState<StatsResponse["totals"] | null>(null);
  const [streak, setStreak] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [a, s] = await Promise.all([api<AvatarsPayload>("/api/avatars"), api<StatsResponse>("/api/stats")]);
      setData(a);
      setTotals(s.totals);
      setStreak(s.user.streak);
    } catch {
      toast.push({ title: "No pudimos cargar tus premios", tone: "err" });
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  async function unlock(id: string) {
    setBusy(`unlock-${id}`);
    try {
      const res = await api<{ unlocked: string[] }>("/api/avatars", {
        method: "POST",
        body: JSON.stringify({ avatarId: id }),
      });
      setData((d) => (d ? { ...d, unlocked: res.unlocked } : d));
      const def = AVATARS.find((a) => a.id === id);
      toast.push({ title: `Avatar desbloqueado: ${def?.name}`, description: "Ya puedes usarlo en tu perfil.", tone: "ok" });
    } catch (e) {
      toast.push({ title: "Aún no", description: e instanceof Error ? e.message : undefined, tone: "warn" });
    } finally {
      setBusy(null);
    }
  }

  async function select(id: string) {
    setBusy(`select-${id}`);
    try {
      const res = await api<{ user: PublicUser }>("/api/me", {
        method: "PATCH",
        body: JSON.stringify({ avatar: id }),
      });
      setData((d) => (d ? { ...d, user: { ...d.user, avatar: res.user.avatar } } : d));
      toast.push({ title: "Nuevo look activado", tone: "ok" });
      router.refresh();
    } catch (e) {
      toast.push({ title: "No se pudo cambiar", description: e instanceof Error ? e.message : undefined, tone: "err" });
    } finally {
      setBusy(null);
    }
  }

  const unlockedCount = data?.unlocked.length ?? 0;
  const achievementList = useMemo(
    () =>
      ACHIEVEMENTS.map((a) => ({
        ...a,
        done: totals ? a.test(totals, streak) : false,
      })),
    [totals, streak]
  );

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[13px] font-bold uppercase tracking-widest text-ink-soft">Puntos · niveles · avatares</p>
        <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">Recompensas</h1>
      </div>

      {/* hero nivel */}
      {!data ? (
        <Skeleton className="h-40 rounded-2xl" />
      ) : (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="flex flex-wrap items-center gap-5 bg-ink p-6 text-paper">
            <AvatarBubble id={data.user.avatar} size={84} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-display text-3xl font-extrabold leading-none">Nivel {data.user.level}</p>
                <Chip color="#FFA9D6">
                  <Flame className="size-3.5" /> {data.user.streak} días
                </Chip>
                <Chip color="#6FD6FF" className="tnum">{data.user.xp} XP total</Chip>
              </div>
              <ProgressBar value={data.user.into} max={data.user.needed} color="#C9F24F" height={14} className="mt-3 border-paper/40 bg-ink" />
              <p className="mt-2 text-xs font-bold text-paper/70">
                {data.user.needed - data.user.into} XP para subir de nivel
              </p>
            </div>
            <div className="text-center">
              <p className="font-display text-4xl font-extrabold leading-none">
                {unlockedCount}
                <span className="text-lg text-paper/60">/{AVATARS.length}</span>
              </p>
              <p className="mt-1 text-[11px] font-bold uppercase tracking-wider text-paper/60">avatares</p>
            </div>
          </Card>
        </motion.div>
      )}

      {/* avatares */}
      <div>
        <h2 className="font-display text-xl font-extrabold tracking-tight">Colección de avatares</h2>
        <p className="mt-0.5 text-sm font-medium text-ink-soft">Sube de nivel para desbloquearlos y presume tu constancia.</p>
      </div>
      {!data ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {AVATARS.map((a, i) => {
            const isUnlocked = data.unlocked.includes(a.id);
            const isCurrent = data.user.avatar === a.id;
            const canUnlock = !isUnlocked && a.level <= data.user.level;
            const Icon = iconByName(a.icon);
            return (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.035 }}
                className={cx(
                  "relative rounded-2xl border-2 border-ink p-4 text-center shadow-pop",
                  isCurrent ? "bg-ink text-paper" : isUnlocked ? "bg-white" : "bg-white"
                )}
              >
                {isCurrent && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                    <Chip color="#C9F24F">En uso</Chip>
                  </span>
                )}
                <div className="relative mx-auto w-fit">
                  <AvatarBubble id={a.id} size={58} className={cx(!isUnlocked && "grayscale opacity-40")} />
                  {!isUnlocked && (
                    <span className="absolute -bottom-1.5 -right-1.5 flex size-6 items-center justify-center rounded-lg border-2 border-ink bg-white">
                      <Lock className="size-3" strokeWidth={2.6} />
                    </span>
                  )}
                </div>
                <p className="mt-2.5 font-display text-[15px] font-extrabold">{a.name}</p>
                <p className={cx("text-xs font-semibold", isCurrent ? "text-paper/70" : "text-ink-soft")}>{a.tagline}</p>
                <div className="mt-3">
                  {isCurrent ? (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-limey">
                      <Check className="size-4" strokeWidth={3} /> Activo
                    </span>
                  ) : isUnlocked ? (
                    <Button size="sm" variant="white" loading={busy === `select-${a.id}`} onClick={() => select(a.id)}>
                      Usar
                    </Button>
                  ) : canUnlock ? (
                    <Button size="sm" loading={busy === `unlock-${a.id}`} onClick={() => unlock(a.id)}>
                      <Sparkles className="size-4" /> Desbloquear
                    </Button>
                  ) : (
                    <Chip color="#FFFFFF">
                      <Lock className="size-3" /> Nivel {a.level}
                    </Chip>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* logros */}
      <div className="pt-2">
        <h2 className="font-display text-xl font-extrabold tracking-tight">Logros</h2>
        <p className="mt-0.5 text-sm font-medium text-ink-soft">Metas permanentes que celebran tu recorrido.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {achievementList.map((a) => {
          const Icon = iconByName(a.icon);
          return (
            <Card key={a.name} flat className={cx("flex items-center gap-3 p-4", !a.done && "opacity-60")}>
              <div
                className="flex size-11 shrink-0 items-center justify-center rounded-xl border-2 border-ink shadow-pop-xs"
                style={{ background: a.done ? a.color : "#E9E5DC" }}
              >
                {a.done ? <Icon className="size-5" strokeWidth={2.2} /> : <Lock className="size-5" strokeWidth={2.2} />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-display text-[15px] font-extrabold leading-tight">{a.name}</p>
                <p className="text-xs font-semibold text-ink-soft">{a.desc}</p>
              </div>
              {a.done && (
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-minty">
                  <Check className="size-4" strokeWidth={3} />
                </span>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
