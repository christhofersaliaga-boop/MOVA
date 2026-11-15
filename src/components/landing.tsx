"use client";

import {
  Armchair,
  ArrowRight,
  BellRing,
  Dumbbell,
  Flame,
  Footprints,
  Play,
  Sparkles,
  Target,
  Timer,
  TrendingUp,
  Trophy,
  Zap,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Chip } from "@/components/ui";

const MARQUEE = [
  "MICRO-RUTINAS DE 3 MIN",
  "RETOS DIARIOS PROGRESIVOS",
  "ALERTAS DE SEDENTARISMO",
  "PUNTOS Y NIVELES",
  "AVATARES DESBLOQUEABLES",
  "RECORDATORIOS INTELIGENTES",
];

const FEATURES = [
  {
    icon: Timer,
    color: "#B9A8FF",
    title: "Micro-rutinas de 3 min",
    text: "Estiramientos y movilidad sin equipo, pensadas para tu carpeta o cuarto de estudio.",
  },
  {
    icon: Armchair,
    color: "#FFC84D",
    title: "Alertas de sedentarismo",
    text: "Detectamos tus maratones de estudio y te sugerimos una pausa justo cuando la necesitas.",
  },
  {
    icon: Target,
    color: "#8FE388",
    title: "Retos progresivos",
    text: "Metas súper accesibles al inicio: pararte 5 veces, 500 pasos extra, estirar el cuello.",
  },
  {
    icon: Trophy,
    color: "#FFA9D6",
    title: "Recompensas y avatares",
    text: "Gana XP, sube de nivel y desbloquea avatares que presumen tu constancia.",
  },
];

const STEPS = [
  { n: "1", title: "Carga tu horario", text: "Registra tus clases y Mova encuentra los huecos ideales para pausas activas." },
  { n: "2", title: "Muévete en minis", text: "Rutinas de 2 a 5 minutos entre clases, sin equipo ni sudor de gym." },
  { n: "3", title: "Sube de nivel", text: "Cada pausa suma XP, alimenta tu racha y desbloquea recompensas." },
];

export function Landing() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enterDemo() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "demo@mova.app", password: "movademo" }),
      });
      if (!res.ok) throw new Error();
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("No pudimos abrir la demo. Intenta de nuevo.");
      setBusy(false);
    }
  }

  return (
    <div className="bg-grid min-h-dvh overflow-x-clip">
      {/* nav */}
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <div className="flex items-center gap-2.5">
          <span className="flex size-10 items-center justify-center rounded-xl border-2 border-ink bg-limey shadow-pop-sm">
            <Zap className="size-5.5" strokeWidth={2.6} />
          </span>
          <span className="font-display text-2xl font-extrabold tracking-tight">
            Mova<span className="text-viola">.</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/login">
            <Button variant="white" size="sm" className="sm:h-10 sm:px-4">
              Entrar
            </Button>
          </Link>
          <Link href="/registro" className="hidden sm:block">
            <Button size="sm" className="sm:h-10 sm:px-4">
              Crear cuenta
            </Button>
          </Link>
        </div>
      </header>

      {/* hero */}
      <section className="mx-auto grid w-full max-w-6xl items-center gap-10 px-4 pb-16 pt-6 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:pt-12">
        <div>
          <Chip color="#FFA9D6" className="rotate-[-1.5deg]">
            <Sparkles className="size-3.5" /> Para estudiantes que estudian sentados
          </Chip>
          <h1 className="mt-5 font-display text-[44px] font-extrabold leading-[0.98] tracking-tight sm:text-6xl lg:text-7xl">
            Tu cuerpo también{" "}
            <span className="relative inline-block">
              <span className="absolute inset-x-0 bottom-1 -z-10 h-4 -rotate-1 rounded bg-limey sm:h-6" />
              va a clases
            </span>
            .
          </h1>
          <p className="mt-5 max-w-md text-lg font-medium leading-relaxed text-ink-soft">
            Combate el sedentarismo con pausas activas de 2 a 5 minutos, retos
            diarios accesibles y recompensas que mantienen la motivación. Sin
            gym, sin equipo, sin excusas.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Button size="lg" variant="ink" onClick={enterDemo} loading={busy}>
              <Play className="size-5" /> Probar demo en vivo
            </Button>
            <Link href="/registro">
              <Button size="lg" variant="white">
                Crear cuenta gratis <ArrowRight className="size-5" />
              </Button>
            </Link>
          </div>
          {error && <p className="mt-3 text-sm font-bold text-coral">{error}</p>}
          <p className="mt-4 text-xs font-bold uppercase tracking-wider text-ink-soft">
            Demo: demo@mova.app · movademo
          </p>
          <div className="mt-8 flex items-center gap-5">
            <div className="flex items-center gap-2">
              <Flame className="size-5 text-coral" strokeWidth={2.5} />
              <span className="text-sm font-bold">Rachas reales</span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="size-5 text-viola" strokeWidth={2.5} />
              <span className="text-sm font-bold">Progreso visible</span>
            </div>
            <div className="flex items-center gap-2">
              <BellRing className="size-5 text-skyy" strokeWidth={2.5} />
              <span className="text-sm font-bold">Avisos a tu hora</span>
            </div>
          </div>
        </div>

        {/* hero visual */}
        <div className="relative mx-auto w-full max-w-md lg:max-w-none">
          <div className="animate-floaty absolute -left-2 top-6 z-10 rounded-2xl border-2 border-ink bg-white px-3.5 py-2 shadow-pop [--r:-6deg]">
            <p className="flex items-center gap-1.5 font-display text-sm font-extrabold">
              <Zap className="size-4 text-viola" /> +30 XP
            </p>
            <p className="text-[11px] font-bold text-ink-soft">Micro-rutina completada</p>
          </div>
          <div className="animate-floaty absolute -right-1 top-1/3 z-10 rounded-2xl border-2 border-ink bg-limey px-3.5 py-2 shadow-pop [--r:4deg] [animation-delay:1s]">
            <p className="flex items-center gap-1.5 font-display text-sm font-extrabold">
              <Flame className="size-4 text-coral" /> Racha: 6 días
            </p>
          </div>
          <div className="animate-floaty absolute -bottom-2 left-8 z-10 rounded-2xl border-2 border-ink bg-sunny px-3.5 py-2 shadow-pop [--r:-3deg] [animation-delay:2s]">
            <p className="flex items-center gap-1.5 font-display text-sm font-extrabold">
              <Footprints className="size-4" /> 500 pasos extra
            </p>
          </div>
          <div className="rotate-2 overflow-hidden rounded-[28px] border-2 border-ink bg-lav shadow-pop-lg">
            <Image
              src="/images/hero.png"
              alt="Estudiante estirándose entre clases"
              width={900}
              height={900}
              className="h-auto w-full"
              priority
            />
          </div>
        </div>
      </section>

      {/* marquee */}
      <div className="border-y-2 border-ink bg-ink py-3.5">
        <div className="flex w-max animate-marquee gap-8 whitespace-nowrap">
          {[...MARQUEE, ...MARQUEE, ...MARQUEE, ...MARQUEE].map((t, i) => (
            <span
              key={i}
              className="flex items-center gap-8 font-display text-sm font-extrabold tracking-widest text-paper"
            >
              {t} <Zap className="size-4 text-limey" fill="#C9F24F" />
            </span>
          ))}
        </div>
      </div>

      {/* features */}
      <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
        <h2 className="max-w-xl font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
          Todo lo que un estudiante sedentario necesita
        </h2>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className="group rounded-2xl border-2 border-ink bg-white p-5 shadow-pop transition-transform hover:-translate-y-1"
              >
                <div
                  className={`flex size-12 items-center justify-center rounded-xl border-2 border-ink shadow-pop-xs transition-transform group-hover:rotate-6 ${i % 2 ? "rotate-2" : "-rotate-2"}`}
                  style={{ background: f.color }}
                >
                  <Icon className="size-6" strokeWidth={2.2} />
                </div>
                <h3 className="mt-4 font-display text-lg font-extrabold">{f.title}</h3>
                <p className="mt-1.5 text-sm font-medium leading-relaxed text-ink-soft">{f.text}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* steps */}
      <section className="mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6 lg:pb-24">
        <div className="rounded-[28px] border-2 border-ink bg-viola p-7 shadow-pop-lg sm:p-12">
          <h2 className="font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Cómo funciona
          </h2>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="rounded-2xl border-2 border-ink bg-paper p-5 shadow-pop-sm">
                <span className="flex size-10 items-center justify-center rounded-xl border-2 border-ink bg-sunny font-display text-lg font-extrabold shadow-pop-xs">
                  {s.n}
                </span>
                <h3 className="mt-3.5 font-display text-lg font-extrabold">{s.title}</h3>
                <p className="mt-1.5 text-sm font-medium leading-relaxed text-ink-soft">{s.text}</p>
              </div>
            ))}
          </div>
          <div className="mt-9 flex flex-wrap gap-3">
            <Button size="lg" variant="primary" onClick={enterDemo} loading={busy}>
              <Dumbbell className="size-5" /> Empieza con la demo
            </Button>
            <Link href="/registro">
              <Button size="lg" variant="white">
                Crear mi cuenta
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t-2 border-ink bg-paper py-6 text-center">
        <p className="text-sm font-bold text-ink-soft">
          Mova<span className="text-viola">.</span> — pequeñas pausas, grandes cambios.
        </p>
      </footer>
    </div>
  );
}
