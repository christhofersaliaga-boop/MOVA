"use client";

import { animate, motion } from "framer-motion";
import {
  Armchair,
  ArrowRight,
  Check,
  Dumbbell,
  Flame,
  Footprints,
  Plus,
  Timer,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { LevelUpModal } from "@/components/level-up";
import { lastMovementAt, markMovement } from "@/components/reminder-watcher";
import { useToast } from "@/components/toaster";
import {
  AvatarBubble,
  Button,
  Card,
  Chip,
  Field,
  inputCls,
  Modal,
  PageLoader,
  ProgressBar,
  Skeleton,
} from "@/components/ui";
import { activityMeta } from "@/lib/activity-meta";
import { api } from "@/lib/client/api";
import { friendlyLongDate, greeting, todayKey } from "@/lib/dates";
import { iconByName } from "@/lib/icons";
import { ROUTINES } from "@/lib/routines";
import type { ActivityDTO, ChallengeDTO, GamificationState, StatsResponse } from "@/lib/types";

/* ------------------------------ tiny count up ------------------------------ */

function CountUp({ value }: { value: number }) {
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);
  useEffect(() => {
    const controls = animate(prev.current, value, {
      duration: 0.7,
      ease: "easeOut",
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    prev.current = value;
    return () => controls.stop();
  }, [value]);
  return <span className="tnum">{display.toLocaleString("es-MX")}</span>;
}

/* ----------------------------- sedentary meter ------------------------------ */

function SedentaryMeter({ limit }: { limit: number }) {
  const [idle, setIdle] = useState(0);
  useEffect(() => {
    const update = () =>
      setIdle(Math.floor((Date.now() - lastMovementAt()) / 60000));
    update();
    const t = setInterval(update, 30000);
    const onMoved = () => update();
    window.addEventListener("mova:moved", onMoved);
    return () => {
      clearInterval(t);
      window.removeEventListener("mova:moved", onMoved);
    };
  }, []);

  const pct = Math.min(100, (idle / limit) * 100);
  const color = idle >= limit ? "#FF7461" : idle >= limit * 0.6 ? "#FFC84D" : "#8FE388";
  const msg =
    idle >= limit
      ? "Toca pausa activa: superaste tu límite sentado"
      : idle >= limit * 0.6
        ? "Vas acumulando tiempo sentado…"
        : "Buen ritmo: movimiento reciente";

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className="flex size-11 items-center justify-center rounded-xl border-2 border-ink shadow-pop-xs"
            style={{ background: color }}
          >
            <Armchair className="size-5" strokeWidth={2.2} />
          </div>
          <div>
            <p className="font-display text-[15px] font-extrabold leading-tight">
              {idle === 0 ? "Te moviste hace nada" : `Llevas ${idle} min sentado`}
            </p>
            <p className="text-xs font-bold text-ink-soft">{msg}</p>
          </div>
        </div>
        <Button size="sm" variant="white" onClick={markMovement}>
          <Check className="size-4" /> Me moví
        </Button>
      </div>
      <ProgressBar value={pct} max={100} color={color} height={10} className="mt-4" />
      <p className="mt-2 text-[11px] font-bold uppercase tracking-wider text-ink-soft">
        Alerta inteligente a los {limit} min
      </p>
    </Card>
  );
}

/* --------------------------------- main view -------------------------------- */

export function DashboardHome() {
  const toast = useToast();
  const router = useRouter();
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [levelUp, setLevelUp] = useState<number | null>(null);
  const [modal, setModal] = useState<null | "steps" | "activity">(null);
  const [bumping, setBumping] = useState<number | null>(null);
  const levelRef = useRef<number | null>(null);

  const load = useCallback(async (silent = false) => {
    try {
      const s = await api<StatsResponse>("/api/stats");
      setStats(s);
      levelRef.current ??= s.user.level;
      setError(null);
    } catch (e) {
      if (!silent) setError(e instanceof Error ? e.message : "Error al cargar");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function applyGame(game?: GamificationState | null) {
    if (!game) return;
    if (levelRef.current !== null && game.level > levelRef.current) {
      setLevelUp(game.level);
    }
    levelRef.current = game.level;
    setStats((s) =>
      s
        ? {
            ...s,
            user: {
              ...s.user,
              xp: game.xp,
              level: game.level,
              into: game.into,
              needed: game.needed,
              streak: game.streak ?? s.user.streak,
            },
          }
        : s
    );
    router.refresh();
  }

  async function bumpChallenge(c: ChallengeDTO) {
    if (bumping) return;
    const amount = c.unit === "pasos" ? 100 : 1;
    setBumping(c.id);
    // optimista
    setStats((s) =>
      s
        ? {
            ...s,
            challenges: s.challenges.map((x) =>
              x.id === c.id
                ? {
                    ...x,
                    progress: Math.min(x.target, x.progress + amount),
                    completed: x.progress + amount >= x.target,
                  }
                : x
            ),
          }
        : s
    );
    try {
      const res = await api<{ challenge: ChallengeDTO; game: GamificationState | null }>(
        `/api/challenges/${c.id}`,
        { method: "PATCH", body: JSON.stringify({ op: "increment", amount }) }
      );
      markMovement();
      applyGame(res.game);
      if (res.challenge.completed && !c.completed) {
        toast.push({
          title: `¡Reto completado! +${res.challenge.xp} XP`,
          description: res.challenge.title,
          tone: "ok",
        });
      }
      load(true);
    } catch (e) {
      toast.push({ title: "No se guardó", description: e instanceof Error ? e.message : undefined, tone: "err" });
      load(true);
    } finally {
      setBumping(null);
    }
  }

  if (error && !stats) {
    return (
      <div className="py-20 text-center">
        <p className="font-display text-lg font-bold">{error}</p>
        <Button className="mt-4" onClick={() => load()}>
          Reintentar
        </Button>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-9 w-64" />
            <Skeleton className="mt-2 h-4 w-40" />
          </div>
          <Skeleton className="h-10 w-28" />
        </div>
        <Skeleton className="h-32 w-full rounded-2xl" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  const { user, today, week, challenges, recent } = stats;
  const suggested = ROUTINES[new Date().getDay() % ROUTINES.length];
  const SuggestIcon = iconByName(suggested.icon);
  const doneChallenges = challenges.filter((c) => c.completed).length;

  return (
    <div className="space-y-5">
      {/* encabezado */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap items-end justify-between gap-3"
      >
        <div>
          <p className="text-[13px] font-bold uppercase tracking-widest text-ink-soft">
            {friendlyLongDate()}
          </p>
          <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
            {greeting()}, {user.name.split(" ")[0]}
          </h1>
        </div>
        <Chip color="#FFA9D6" className="rotate-1">
          <Flame className="size-3.5" /> {user.streak} días de racha
        </Chip>
      </motion.div>

      {/* nivel + medidor */}
      <div className="grid gap-4 lg:grid-cols-[1.25fr_1fr]">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card className="flex h-full items-center gap-4 bg-ink p-5 text-paper">
            <AvatarBubble id={user.avatar} size={64} />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <p className="font-display text-lg font-extrabold">
                  Nivel {user.level}
                </p>
                <p className="tnum text-xs font-bold text-paper/70">
                  {user.into} / {user.needed} XP
                </p>
              </div>
              <div className="mt-2 h-3.5 w-full overflow-hidden rounded-full border-2 border-paper/40 bg-ink">
                <motion.div
                  className="h-full rounded-full bg-limey"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, (user.into / user.needed) * 100)}%` }}
                  transition={{ type: "spring", stiffness: 80, damping: 18 }}
                />
              </div>
              <p className="mt-1.5 text-xs font-medium text-paper/70">
                {user.needed - user.into} XP para el nivel {user.level + 1} · Muévete para subir
              </p>
            </div>
            <Link href="/recompensas" className="press hidden sm:block">
              <Button variant="primary" size="sm">
                Premios <ArrowRight className="size-4" />
              </Button>
            </Link>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <SedentaryMeter limit={user.sedentaryMinutes} />
        </motion.div>
      </div>

      {/* stats */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4"
      >
        {[
          { label: "Minutos activos", value: today.minutes, icon: Timer, color: "#C9F24F", suffix: "min" },
          { label: "Pasos de hoy", value: today.steps, icon: Footprints, color: "#6FD6FF", suffix: "" },
          { label: "Pausas hechas", value: today.breaks, icon: Dumbbell, color: "#FFA9D6", suffix: "" },
          { label: "XP ganado hoy", value: today.xp, icon: Zap, color: "#FFC84D", suffix: "XP" },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label} flat className="p-4">
              <div
                className="flex size-9 items-center justify-center rounded-lg border-2 border-ink"
                style={{ background: s.color }}
              >
                <Icon className="size-4.5" strokeWidth={2.4} />
              </div>
              <p className="mt-3 font-display text-2xl font-extrabold leading-none">
                <CountUp value={s.value} />
                {s.suffix && <span className="ml-1 text-sm font-bold text-ink-soft">{s.suffix}</span>}
              </p>
              <p className="mt-1 text-xs font-bold uppercase tracking-wider text-ink-soft">
                {s.label}
              </p>
            </Card>
          );
        })}
      </motion.div>

      {/* retos + rutina/semana */}
      <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="h-full p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-extrabold tracking-tight">
                Retos de hoy
                <span className="ml-2 text-sm font-bold text-ink-soft">
                  {doneChallenges}/{challenges.length}
                </span>
              </h2>
              <Link
                href="/retos"
                className="press flex items-center gap-1 font-display text-[13px] font-bold text-viola"
              >
                Ver todos <ArrowRight className="size-4" />
              </Link>
            </div>
            <div className="mt-4 space-y-3">
              {challenges.slice(0, 3).map((c) => {
                const Icon = iconByName(c.icon);
                const amount = c.unit === "pasos" ? 100 : 1;
                return (
                  <div
                    key={c.id}
                    className={`flex items-center gap-3 rounded-xl border-2 border-ink p-3 transition-colors ${c.completed ? "bg-limey/25" : "bg-paper"}`}
                  >
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border-2 border-ink bg-white shadow-pop-xs">
                      <Icon className="size-5" strokeWidth={2.2} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold">{c.title}</p>
                      <ProgressBar
                        value={c.progress}
                        max={c.target}
                        color={c.completed ? "#8FE388" : "#7C6CFF"}
                        height={8}
                        className="mt-1.5"
                      />
                      <p className="tnum mt-1 text-[11px] font-bold text-ink-soft">
                        {c.progress}/{c.target} {c.unit} · +{c.xp} XP
                      </p>
                    </div>
                    {c.completed ? (
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border-2 border-ink bg-minty shadow-pop-xs">
                        <Check className="size-5" strokeWidth={3} />
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        variant="white"
                        loading={bumping === c.id}
                        onClick={() => bumpChallenge(c)}
                        aria-label={`Sumar ${amount} a ${c.title}`}
                      >
                        +{amount}
                      </Button>
                    )}
                  </div>
                );
              })}
              {challenges.length === 0 && (
                <p className="py-6 text-center text-sm font-bold text-ink-soft">
                  Generando tus retos del día…
                </p>
              )}
            </div>
            <div className="mt-4 flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => setModal("steps")}>
                <Footprints className="size-4" /> Registrar pasos
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setModal("activity")}>
                <Plus className="size-4" /> Registrar actividad
              </Button>
            </div>
          </Card>
        </motion.div>

        <div className="space-y-4">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <Link href={`/rutinas?r=${suggested.id}`} className="block">
              <div className="press rounded-2xl border-2 border-ink p-5 shadow-pop" style={{ background: suggested.color }}>
                <div className="flex items-start justify-between">
                  <div>
                    <Chip color="#FFFFFF">Sugerida para ti</Chip>
                    <h3 className="mt-3 font-display text-xl font-extrabold leading-tight">
                      {suggested.name}
                    </h3>
                    <p className="mt-1 text-[13px] font-bold text-ink/70">
                      {suggested.minutes} min · {suggested.exercises.length} ejercicios · +{suggested.xp} XP
                    </p>
                  </div>
                  <div className="flex size-14 shrink-0 -rotate-6 items-center justify-center rounded-2xl border-2 border-ink bg-white shadow-pop-sm">
                    <SuggestIcon className="size-7" strokeWidth={2} />
                  </div>
                </div>
                <div className="press mt-4 inline-flex items-center gap-2 rounded-xl border-2 border-ink bg-ink px-4 py-2 font-display text-sm font-bold text-paper">
                  Empezar ahora <ArrowRight className="size-4" />
                </div>
              </div>
            </Link>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="p-5">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-extrabold tracking-tight">Tu semana</h2>
                <Link href="/progreso" className="press flex items-center gap-1 font-display text-[13px] font-bold text-viola">
                  Detalle <ArrowRight className="size-4" />
                </Link>
              </div>
              <div className="mt-3 h-[150px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={week} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                    <XAxis
                      dataKey="label"
                      tickLine={false}
                      axisLine={{ stroke: "#17141F", strokeWidth: 2 }}
                      tick={{ fontSize: 11, fontWeight: 700, fill: "#55506a" }}
                    />
                    <Tooltip
                      cursor={{ fill: "rgba(23,20,31,0.06)" }}
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0].payload as { label: string; minutes: number; steps: number };
                        return (
                          <div className="rounded-lg border-2 border-ink bg-white px-2.5 py-1.5 text-xs font-bold shadow-pop-xs">
                            {d.label}: {d.minutes} min · {d.steps.toLocaleString("es-MX")} pasos
                          </div>
                        );
                      }}
                    />
                    <Bar dataKey="minutes" radius={[6, 6, 0, 0]} stroke="#17141F" strokeWidth={2}>
                      {week.map((d) => (
                        <Cell key={d.key} fill={d.key === todayKey() ? "#7C6CFF" : "#C9F24F"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">
                Minutos activos por día
              </p>
            </Card>
          </motion.div>
        </div>
      </div>

      {/* recientes */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
        <Card className="p-5">
          <h2 className="font-display text-lg font-extrabold tracking-tight">Movimiento reciente</h2>
          {recent.length === 0 ? (
            <div className="mt-4 rounded-xl border-2 border-dashed border-ink/40 bg-paper p-6 text-center">
              <p className="font-display font-extrabold">Hoy aún no registramos movimiento</p>
              <p className="mt-1 text-sm font-medium text-ink-soft">
                Empieza con algo pequeño: una rutina de 3 minutos cuenta.
              </p>
              <Link href="/rutinas" className="mt-4 inline-block">
                <Button size="sm">Explorar rutinas</Button>
              </Link>
            </div>
          ) : (
            <ul className="mt-4 divide-y-2 divide-ink/10">
              {recent.map((a) => (
                <ActivityRow key={a.id} a={a} />
              ))}
            </ul>
          )}
        </Card>
      </motion.div>

      <StepsModal
        open={modal === "steps"}
        onClose={() => setModal(null)}
        onDone={(game, xp) => {
          applyGame(game);
          markMovement();
          toast.push({ title: `+${xp} XP`, description: "Pasos registrados. ¡Sigue así!", tone: "ok" });
          load(true);
        }}
      />
      <ActivityModal
        open={modal === "activity"}
        onClose={() => setModal(null)}
        onDone={(game, title) => {
          applyGame(game);
          markMovement();
          toast.push({ title: "Actividad registrada", description: title, tone: "ok" });
          load(true);
        }}
      />
      <LevelUpModal level={levelUp} onClose={() => setLevelUp(null)} />
    </div>
  );
}

export function ActivityRow({ a }: { a: ActivityDTO }) {
  const meta = activityMeta(a.type);
  const Icon = iconByName(meta.icon);
  return (
    <li className="flex items-center gap-3 py-3">
      <div
        className="flex size-9 shrink-0 items-center justify-center rounded-lg border-2 border-ink"
        style={{ background: meta.color }}
      >
        <Icon className="size-4.5" strokeWidth={2.2} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold">{a.title}</p>
        <p className="text-xs font-bold text-ink-soft">
          {a.minutes > 0 && `${a.minutes} min`}
          {a.minutes > 0 && a.steps > 0 && " · "}
          {a.steps > 0 && `${a.steps.toLocaleString("es-MX")} pasos`}
        </p>
      </div>
      <Chip color="#FFFFFF" className="tnum shrink-0">+{a.xp} XP</Chip>
    </li>
  );
}

/* --------------------------------- modales --------------------------------- */

function StepsModal({
  open,
  onClose,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  onDone: (game: GamificationState, xp: number) => void;
}) {
  const [steps, setSteps] = useState(500);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ activity: ActivityDTO; game: GamificationState }>("/api/activities", {
        method: "POST",
        body: JSON.stringify({ type: "steps", title: "Pasos extra", steps }),
      });
      onDone(res.game, res.activity.xp);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Registrar pasos">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-4 gap-2">
          {[250, 500, 1000, 2000].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setSteps(n)}
              className={`press cursor-pointer rounded-xl border-2 border-ink py-2.5 font-display text-sm font-extrabold ${steps === n ? "bg-limey shadow-pop-xs" : "bg-white"}`}
            >
              {n}
            </button>
          ))}
        </div>
        <Field label="Pasos exactos">
          <input
            className={inputCls}
            type="number"
            min={1}
            max={100000}
            value={steps}
            onChange={(e) => setSteps(Number(e.target.value))}
          />
        </Field>
        {error && <p className="text-sm font-bold text-coral">{error}</p>}
        <Button type="submit" className="w-full" size="lg" loading={busy}>
          Sumar {steps.toLocaleString("es-MX")} pasos
        </Button>
      </form>
    </Modal>
  );
}

function ActivityModal({
  open,
  onClose,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  onDone: (game: GamificationState, title: string) => void;
}) {
  const [type, setType] = useState<"walk" | "stretch" | "custom">("walk");
  const [title, setTitle] = useState("");
  const [minutes, setMinutes] = useState(10);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const presets: { v: "walk" | "stretch" | "custom"; label: string }[] = [
    { v: "walk", label: "Caminata" },
    { v: "stretch", label: "Estiramiento" },
    { v: "custom", label: "Otra" },
  ];

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const finalTitle =
        title.trim() ||
        (type === "walk" ? "Caminata" : type === "stretch" ? "Estiramiento libre" : "Actividad");
      const res = await api<{ activity: ActivityDTO; game: GamificationState }>("/api/activities", {
        method: "POST",
        body: JSON.stringify({ type, title: finalTitle, minutes }),
      });
      onDone(res.game, res.activity.title);
      onClose();
      setTitle("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Registrar actividad">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Tipo">
          <div className="grid grid-cols-3 gap-2">
            {presets.map((p) => (
              <button
                key={p.v}
                type="button"
                onClick={() => setType(p.v)}
                className={`press cursor-pointer rounded-xl border-2 border-ink py-2.5 font-display text-sm font-extrabold ${type === p.v ? "bg-skyy shadow-pop-xs" : "bg-white"}`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Nombre (opcional)">
          <input
            className={inputCls}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej. Vuelta a la biblioteca"
          />
        </Field>
        <Field label="Minutos">
          <input
            className={inputCls}
            type="number"
            min={1}
            max={300}
            value={minutes}
            onChange={(e) => setMinutes(Number(e.target.value))}
            required
          />
        </Field>
        {error && <p className="text-sm font-bold text-coral">{error}</p>}
        <Button type="submit" className="w-full" size="lg" loading={busy}>
          Guardar actividad
        </Button>
      </form>
    </Modal>
  );
}
