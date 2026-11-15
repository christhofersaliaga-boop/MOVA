"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Pause, Play, SkipForward, Sparkles, Volume2, VolumeX, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { markMovement } from "@/components/reminder-watcher";
import { Button, ProgressBar, ProgressRing } from "@/components/ui";
import { api } from "@/lib/client/api";
import { speak, stopSpeaking, voicePref, warmupVoices } from "@/lib/speech";
import type { Routine } from "@/lib/routines";
import type { GamificationState } from "@/lib/types";

export function RoutinePlayer({
  routine,
  onClose,
  onFinish,
}: {
  routine: Routine;
  onClose: () => void;
  onFinish: (game: GamificationState) => void;
}) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);
  const [voice, setVoice] = useState(true);
  const exercise = routine.exercises[index];
  const [secondsLeft, setSecondsLeft] = useState(exercise.seconds);
  const announcedRef = useRef(false);

  const totalSeconds = useMemo(
    () => routine.exercises.reduce((s, e) => s + e.seconds, 0),
    [routine]
  );
  const elapsedTotal = useMemo(() => {
    let acc = 0;
    for (let i = 0; i < index; i++) acc += routine.exercises[i].seconds;
    return acc + (exercise.seconds - secondsLeft);
  }, [index, exercise, secondsLeft, routine]);

  useEffect(() => {
    warmupVoices();
    setVoice(voicePref());
    // anuncio inicial (el gesto de "Empezar" habilita el audio en moviles)
    const t = setTimeout(() => {
      speak(`Comenzamos. ${routine.name}. Primer ejercicio: ${routine.exercises[0].name}. ${routine.exercises[0].cue}`);
    }, 350);
    announcedRef.current = true;
    return () => {
      clearTimeout(t);
      stopSpeaking();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (paused || done) return;
    const t = setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [paused, done]);

  useEffect(() => {
    if (done || secondsLeft > 0) return;
    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(40);
    if (index < routine.exercises.length - 1) {
      const nextIdx = index + 1;
      setIndex(nextIdx);
      setSecondsLeft(routine.exercises[nextIdx].seconds);
      const nxt = routine.exercises[nextIdx];
      speak(`Siguiente: ${nxt.name}. ${nxt.cue}`);
    } else {
      setDone(true);
      speak(`¡Rutina completa! Muy bien. Ganarás ${routine.xp} puntos de experiencia.`);
    }
  }, [secondsLeft, done, index, routine]);

  function next() {
    if (index < routine.exercises.length - 1) {
      const nextIdx = index + 1;
      setIndex(nextIdx);
      setSecondsLeft(routine.exercises[nextIdx].seconds);
      const nxt = routine.exercises[nextIdx];
      speak(`Siguiente: ${nxt.name}. ${nxt.cue}`);
    } else {
      setDone(true);
      speak(`¡Rutina completa! Muy bien. Ganarás ${routine.xp} puntos de experiencia.`);
    }
  }

  function toggleVoice() {
    const nextVal = !voice;
    setVoice(nextVal);
    // preferencia de sesion: se persiste en Perfil
    try {
      localStorage.setItem("mova:voice", nextVal ? "1" : "0");
    } catch {}
    if (!nextVal) stopSpeaking();
    else speak("Voz activada. ¡Vamos!");
  }

  function close() {
    stopSpeaking();
    onClose();
  }

  async function finish() {
    setSaving(true);
    try {
      const res = await api<{ game: GamificationState }>("/api/activities", {
        method: "POST",
        body: JSON.stringify({
          type: "routine",
          title: `Micro-rutina: ${routine.name}`,
          minutes: routine.minutes,
          xp: routine.xp,
        }),
      });
      markMovement();
      onFinish(res.game);
    } finally {
      setSaving(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[95] flex flex-col"
      style={{ background: routine.color }}
    >
      {/* header */}
      <div className="flex items-center justify-between gap-2 px-4 pt-4 sm:px-8 sm:pt-6">
        <div className="rounded-xl border-2 border-ink bg-white px-3 py-1.5 font-display text-sm font-extrabold shadow-pop-xs">
          {routine.name}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleVoice}
            className={`press flex h-10 cursor-pointer items-center justify-center gap-1.5 rounded-xl border-2 border-ink px-3 font-display text-xs font-extrabold shadow-pop-xs ${voice ? "bg-limey" : "bg-white text-ink-soft"}`}
            aria-label={voice ? "Silenciar voz" : "Activar voz"}
          >
            {voice ? <Volume2 className="size-4.5" /> : <VolumeX className="size-4.5" />}
            <span className="hidden sm:inline">{voice ? "Voz activada" : "Voz apagada"}</span>
          </button>
          <button
            onClick={close}
            className="press flex size-10 cursor-pointer items-center justify-center rounded-xl border-2 border-ink bg-white shadow-pop-xs"
            aria-label="Cerrar rutina"
          >
            <X className="size-5" />
          </button>
        </div>
      </div>

      <div className="mx-auto mt-3 w-full max-w-md px-4 sm:px-8">
        <div className="flex items-center justify-between text-xs font-extrabold uppercase tracking-wider text-ink/70">
          <span>
            Ejercicio {Math.min(index + 1, routine.exercises.length)}/{routine.exercises.length}
          </span>
          <span>
            {Math.round((elapsedTotal / totalSeconds) * 100)}%
          </span>
        </div>
        <ProgressBar value={elapsedTotal} max={totalSeconds} color="#17141F" height={10} className="mt-1.5" />
      </div>

      {/* content */}
      <div className="flex flex-1 items-center justify-center px-4">
        <AnimatePresence mode="wait">
          {!done ? (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: 40, rotate: 1 }}
              animate={{ opacity: 1, x: 0, rotate: 0 }}
              exit={{ opacity: 0, x: -40, rotate: -1 }}
              transition={{ type: "spring", stiffness: 260, damping: 26 }}
              className="flex w-full max-w-md flex-col items-center text-center"
            >
              <ProgressRing
                size={190}
                stroke={13}
                value={secondsLeft}
                max={exercise.seconds}
                color="#17141F"
              >
                <span className="tnum font-display text-6xl font-extrabold">{secondsLeft}</span>
              </ProgressRing>
              <h2 className="mt-6 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
                {exercise.name}
              </h2>
              <p className="mt-3 max-w-sm rounded-2xl border-2 border-ink bg-white/85 p-4 text-[15px] font-semibold leading-snug shadow-pop-sm">
                {exercise.cue}
              </p>
              {voice && (
                <p className="mt-2 flex items-center gap-1.5 text-xs font-bold text-ink/60">
                  <Volume2 className="size-3.5" /> Te lo estoy indicando con voz
                </p>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 240, damping: 20 }}
              className="flex w-full max-w-md flex-col items-center text-center"
            >
              <motion.div
                initial={{ rotate: -8, scale: 0.8 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 12 }}
                className="flex size-28 items-center justify-center rounded-3xl border-2 border-ink bg-limey shadow-pop"
              >
                <Sparkles className="size-14" strokeWidth={1.8} />
              </motion.div>
              <h2 className="mt-6 font-display text-4xl font-extrabold tracking-tight">
                ¡Rutina completa!
              </h2>
              <p className="mt-2 font-display text-lg font-bold text-ink/80">
                +{routine.xp} XP · {routine.minutes} minutos activos
              </p>
              <p className="mt-3 max-w-xs text-sm font-medium text-ink/70">
                Tu cuerpo te lo agradece. Registra la rutina para alimentar tu racha.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* controls */}
      <div className="mx-auto flex w-full max-w-md items-center justify-center gap-3 px-4 pb-10 sm:pb-14">
        {!done ? (
          <>
            <Button variant="white" size="lg" onClick={() => setPaused((p) => !p)} className="flex-1">
              {paused ? <Play className="size-5" /> : <Pause className="size-5" />}
              {paused ? "Seguir" : "Pausa"}
            </Button>
            <Button variant="ink" size="lg" onClick={next} className="flex-1">
              <SkipForward className="size-5" /> Siguiente
            </Button>
          </>
        ) : (
          <Button variant="ink" size="lg" className="w-full" onClick={finish} loading={saving}>
            <Sparkles className="size-5" /> Registrar y ganar XP
          </Button>
        )}
      </div>
    </motion.div>
  );
}
