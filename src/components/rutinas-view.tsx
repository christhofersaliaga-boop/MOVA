"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Info, Play, Timer } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LevelUpModal } from "@/components/level-up";
import { RoutinePlayer } from "@/components/routine-player";
import { useToast } from "@/components/toaster";
import { Card, Chip } from "@/components/ui";
import { iconByName } from "@/lib/icons";
import { ROUTINES, routineById, type Routine } from "@/lib/routines";
import type { GamificationState } from "@/lib/types";

export function RutinasView({ initialRoutine }: { initialRoutine: string | null }) {
  const toast = useToast();
  const router = useRouter();
  const [active, setActive] = useState<Routine | null>(
    initialRoutine ? routineById(initialRoutine) : null
  );
  const [levelUp, setLevelUp] = useState<number | null>(null);
  const [level, setLevel] = useState<number | null>(null);

  function handleFinish(game: GamificationState) {
    setActive(null);
    if (level !== null && game.level > level) setLevelUp(game.level);
    if (level === null && game.level > 1) {
      // primer rutina: mostramos celebracion solo si subio del nivel base conocido despues
    }
    setLevel(game.level);
    toast.push({
      title: `+${game.xp} XP totales`,
      description: `Nivel ${game.level} · Racha de ${game.streak ?? 1} días`,
      tone: "ok",
    });
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[13px] font-bold uppercase tracking-widest text-ink-soft">
          Sin equipo · En tu carpeta o cuarto
        </p>
        <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
          Micro-rutinas
        </h1>
      </div>

      <Card className="flex items-start gap-3 bg-skyy/40 p-4" flat>
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border-2 border-ink bg-white">
          <Info className="size-4.5" strokeWidth={2.4} />
        </div>
        <p className="text-sm font-medium leading-snug text-ink">
          Cada rutina dura <b>de 2 a 5 minutos</b> y la puedes hacer entre clases o en una pausa de estudio.
          Al terminarla ganas <b>XP</b>, alimentas tu <b>racha</b> y respondes a las alertas de sedentarismo.
        </p>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ROUTINES.map((r, i) => {
          const Icon = iconByName(r.icon);
          return (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <div className="group flex h-full flex-col rounded-2xl border-2 border-ink bg-white shadow-pop transition-transform hover:-translate-y-1">
                <div className="relative flex items-center justify-between rounded-t-2xl border-b-2 border-ink p-4" style={{ background: r.color }}>
                  <div>
                    <p className="text-[11px] font-extrabold uppercase tracking-widest text-ink/70">{r.focus}</p>
                    <h3 className="mt-1 font-display text-xl font-extrabold leading-tight">{r.name}</h3>
                  </div>
                  <div className={`flex size-13 shrink-0 items-center justify-center rounded-2xl border-2 border-ink bg-white shadow-pop-sm transition-transform group-hover:rotate-6 ${i % 2 ? "rotate-3" : "-rotate-3"}`}>
                    <Icon className="size-6.5" strokeWidth={2} />
                  </div>
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <div className="flex flex-wrap gap-1.5">
                    <Chip color="#FFFFFF">
                      <Timer className="size-3.5" /> {r.minutes} min
                    </Chip>
                    <Chip color="#FFFFFF">{r.exercises.length} ejercicios</Chip>
                    <Chip color="#C9F24F" className="tnum">+{r.xp} XP</Chip>
                  </div>
                  <ul className="mt-3 flex-1 space-y-1">
                    {r.exercises.slice(0, 3).map((e) => (
                      <li key={e.name} className="flex items-center gap-2 text-[13px] font-semibold text-ink-soft">
                        <span className="size-1.5 rounded-full bg-ink" />
                        {e.name}
                      </li>
                    ))}
                    {r.exercises.length > 3 && (
                      <li className="text-[12px] font-bold text-ink-soft/70">
                        +{r.exercises.length - 3} más…
                      </li>
                    )}
                  </ul>
                  <button
                    onClick={() => setActive(r)}
                    className="press mt-4 flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-ink bg-ink font-display text-sm font-bold text-paper shadow-pop-sm"
                  >
                    <Play className="size-4" /> Empezar
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <AnimatePresence>
        {active && (
          <RoutinePlayer
            routine={active}
            onClose={() => setActive(null)}
            onFinish={handleFinish}
          />
        )}
      </AnimatePresence>
      <LevelUpModal level={levelUp} onClose={() => setLevelUp(null)} />
    </div>
  );
}
