"use client";

import { motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  Check,
  GlassWater,
  Minus,
  Moon,
  Plus,
  Salad,
  Scale,
  Target,
  Timer,
  TrendingDown,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ActivityRow } from "@/components/dashboard-home";
import { useToast } from "@/components/toaster";
import {
  Button,
  Card,
  Chip,
  DeleteButton,
  EmptyState,
  Skeleton,
  cx,
} from "@/components/ui";
import { api } from "@/lib/client/api";
import { friendlyDay } from "@/lib/dates";
import type { BodyMetricDTO, GamificationState } from "@/lib/types";

type Category = {
  key: "bajo" | "saludable" | "sobrepeso" | "obesidad";
  label: string;
  color: string;
};

function categoryOf(bmi: number): Category {
  if (bmi < 18.5) return { key: "bajo", label: "Bajo peso", color: "#6FD6FF" };
  if (bmi < 25) return { key: "saludable", label: "Peso saludable", color: "#8FE388" };
  if (bmi < 30) return { key: "sobrepeso", label: "Sobrepeso", color: "#FFC84D" };
  return { key: "obesidad", label: "Obesidad", color: "#FF7461" };
}

function Stepper({
  label,
  value,
  onChange,
  step,
  min,
  max,
  unit,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step: number;
  min: number;
  max: number;
  unit: string;
}) {
  const bump = (d: number) =>
    onChange(Math.min(max, Math.max(min, Math.round((value + d * step) * 10) / 10)));
  return (
    <div>
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink-soft">
        {label}
      </span>
      <div className="flex items-stretch gap-1.5">
        <button
          type="button"
          onClick={() => bump(-1)}
          className="press w-10 cursor-pointer rounded-xl border-2 border-ink bg-white shadow-pop-xs"
          aria-label={`Disminuir ${label}`}
        >
          <Minus className="mx-auto size-4" />
        </button>
        <div className="flex h-11 min-w-0 flex-1 items-center justify-center gap-1 rounded-xl border-2 border-ink bg-white px-2">
          <input
            type="number"
            value={value}
            min={min}
            max={max}
            step={step}
            onChange={(e) => onChange(Number(e.target.value))}
            className="tnum w-full max-w-[80px] bg-transparent text-center font-display text-lg font-extrabold outline-none"
          />
          <span className="text-xs font-bold text-ink-soft">{unit}</span>
        </div>
        <button
          type="button"
          onClick={() => bump(1)}
          className="press w-10 cursor-pointer rounded-xl border-2 border-ink bg-white shadow-pop-xs"
          aria-label={`Aumentar ${label}`}
        >
          <Plus className="mx-auto size-4" />
        </button>
      </div>
    </div>
  );
}

const TIPS: Record<Category["key"], { title: string; text: string; tips: { icon: LucideIcon; text: string }[] }> = {
  saludable: {
    title: "Vas muy bien — a mantenerlo",
    text: "Tu IMC está en rango saludable. La meta ahora es la constancia: que el movimiento sea tan normal como lavarse los dientes.",
    tips: [
      { icon: Timer, text: "Mantén 2–3 pausas activas al día para no perder el ritmo." },
      { icon: Activity, text: "Varía tus micro-rutinas para trabajar todo el cuerpo." },
      { icon: GlassWater, text: "Hidratación constante: 6–8 vasos de agua al día." },
      { icon: Moon, text: "Duerme 7–9 horas: el descanso también entrena." },
    ],
  },
  sobrepeso: {
    title: "Plan suave para bajar sin frustrarte",
    text: "El sobrepeso se combate con constancia, no con castigos. Un ritmo seguro es bajar 0.25–0.5 kg por semana. Con Mova lo logras sumando minutos de movimiento a tu día a día.",
    tips: [
      { icon: Target, text: "Semana 1–2: solo retos accesibles (pararte 5 veces, +500 pasos, estirar el cuello). Subir de nivel desbloquea retos medios solo(a)." },
      { icon: Activity, text: "Suma 10 min de movimiento diario con 2 micro-rutinas; en 2 semanas intenta 15–20 min." },
      { icon: TrendingDown, text: "Escala tus pasos gradualmente: +500 esta semana, +1000 la siguiente. Caminar es tu mejor aliado." },
      { icon: GlassWater, text: "Cambia bebidas azucaradas por agua. Solo eso puede recortar cientos de calorías diarias." },
      { icon: Salad, text: "Plato simple: mitad verduras, un cuarto proteína, un cuarto carbohidratos. Sin dietas extremas." },
      { icon: Moon, text: "Dormir poco aumenta el hambre. Cuida tus 7–9 horas." },
    ],
  },
  obesidad: {
    title: "Empieza suave y sube poco a poco",
    text: "Con IMC en obesidad, el progreso seguro es gradual: movimiento de bajo impacto y constancia. Si puedes, acompáñalo con orientación de un profesional de la salud.",
    tips: [
      { icon: Timer, text: "Empieza con las rutinas más suaves (Ojos y mente, Despierta tu cuello) y celebra cada una." },
      { icon: Activity, text: "Prioriza caminatas cortas frecuentes sobre sesiones intensas ocasionales." },
      { icon: Salad, text: "Pequeños cambios de comida sostenidos valen más que dietas relámpago." },
      { icon: TrendingDown, text: "Mide tu progreso semanal aquí: ver la línea bajar es motivación real." },
    ],
  },
  bajo: {
    title: "Suma energía y fuerza con calma",
    text: "Un IMC bajo también merece atención: come suficiente, prioriza proteína en cada comida y suma fuerza suave (sentadillas a la silla, movilidad). Si persiste, consulta a un profesional.",
    tips: [
      { icon: Salad, text: "3 comidas completas + 2 colaciones nutritivas al día." },
      { icon: Activity, text: "Rutinas suaves de fuerza y movilidad para ganar masa muscular." },
      { icon: Moon, text: "El descanso ayuda a recuperar y ganar peso saludable." },
    ],
  },
};

export function ImcView() {
  const toast = useToast();
  const router = useRouter();
  const [metrics, setMetrics] = useState<BodyMetricDTO[] | null>(null);
  const [weight, setWeight] = useState(70);
  const [height, setHeight] = useState(165);
  const [saving, setSaving] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api<{ metrics: BodyMetricDTO[] }>("/api/body-metrics");
      setMetrics(data.metrics);
      if (data.metrics[0] && !initialized) {
        setWeight(data.metrics[0].weightKg);
        setHeight(data.metrics[0].heightCm);
        setInitialized(true);
      }
    } catch {
      toast.push({ title: "No pudimos cargar tus mediciones", tone: "err" });
    }
  }, [toast, initialized]);

  useEffect(() => {
    load();
  }, [load]);

  const bmi = useMemo(() => {
    if (!(weight > 0) || !(height > 0)) return 0;
    const m = height / 100;
    return Math.round((weight / (m * m)) * 10) / 10;
  }, [weight, height]);

  const cat = categoryOf(bmi || 0);
  const tips = TIPS[cat.key];
  const markerPct = Math.min(96, Math.max(2, ((bmi - 15) / 25) * 100));

  const chartData = useMemo(
    () =>
      [...(metrics ?? [])]
        .sort((a, b) => (a.date < b.date ? -1 : 1))
        .map((m) => ({ label: friendlyDay(m.date), bmi: m.bmi, peso: m.weightKg })),
    [metrics]
  );

  async function save() {
    if (saving) return;
    setSaving(true);
    try {
      const res = await api<{ metric: BodyMetricDTO; game: GamificationState }>("/api/body-metrics", {
        method: "POST",
        body: JSON.stringify({ weightKg: weight, heightCm: height }),
      });
      setMetrics((prev) => [res.metric, ...(prev ?? [])]);
      toast.push({
        title: `Medición guardada · +10 XP`,
        description: `IMC ${res.metric.bmi} — ${categoryOf(res.metric.bmi).label}. Nivel ${res.game.level}.`,
        tone: "ok",
      });
      router.refresh();
    } catch (e) {
      toast.push({ title: "No se guardó", description: e instanceof Error ? e.message : undefined, tone: "err" });
    } finally {
      setSaving(false);
    }
  }

  async function remove(m: BodyMetricDTO) {
    const snapshot = metrics;
    setMetrics((prev) => (prev ? prev.filter((x) => x.id !== m.id) : prev));
    try {
      await api(`/api/body-metrics/${m.id}`, { method: "DELETE" });
      toast.push({ title: "Medición eliminada", tone: "warn" });
      router.refresh();
    } catch (e) {
      setMetrics(snapshot);
      toast.push({ title: "No se pudo eliminar", description: e instanceof Error ? e.message : undefined, tone: "err" });
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[13px] font-bold uppercase tracking-widest text-ink-soft">Peso · talla · guía</p>
        <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">Salud e IMC</h1>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[1fr_1.1fr]">
        {/* Calculadora */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-xl border-2 border-ink bg-rosy shadow-pop-xs">
                <Scale className="size-5" strokeWidth={2.2} />
              </div>
              <div>
                <h2 className="font-display text-lg font-extrabold tracking-tight">Calcula tu IMC</h2>
                <p className="text-xs font-bold text-ink-soft">Índice de Masa Corporal = peso ÷ estatura²</p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <Stepper label="Peso" value={weight} onChange={setWeight} step={0.5} min={25} max={400} unit="kg" />
              <Stepper label="Talla" value={height} onChange={setHeight} step={1} min={100} max={230} unit="cm" />
            </div>

            {/* resultado */}
            <div className="mt-5 rounded-2xl border-2 border-ink p-4" style={{ background: `${cat.color}55` }}>
              <div className="flex items-end justify-between gap-2">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-ink/60">Tu IMC</p>
                  <p className="tnum font-display text-5xl font-extrabold leading-none">{bmi || "—"}</p>
                </div>
                <Chip color={cat.color} className="text-xs">{cat.label}</Chip>
              </div>

              {/* escala */}
              <div className="relative mt-4">
                <div className="flex h-4 overflow-hidden rounded-full border-2 border-ink">
                  <div className="h-full bg-skyy" style={{ width: "14%" }} />
                  <div className="h-full bg-minty" style={{ width: "26%" }} />
                  <div className="h-full bg-sunny" style={{ width: "20%" }} />
                  <div className="h-full bg-coral" style={{ width: "40%" }} />
                </div>
                {bmi > 0 && (
                  <motion.div
                    className="absolute -top-2 size-7 -translate-x-1/2 rounded-lg border-2 border-ink bg-white shadow-pop-xs"
                    animate={{ left: `${markerPct}%` }}
                    transition={{ type: "spring", stiffness: 120, damping: 18 }}
                  >
                    <div className="mx-auto mt-[7px] size-2.5 rotate-45 border-2 border-ink" style={{ background: cat.color }} />
                  </motion.div>
                )}
              </div>
              <p className="mt-3 text-[13px] font-semibold leading-snug text-ink/80">{tips.text}</p>
            </div>

            <Button className="mt-4 w-full" size="lg" onClick={save} loading={saving} disabled={bmi <= 0}>
              <Check className="size-5" /> Guardar medición · +10 XP
            </Button>
          </Card>
        </motion.div>

        {/* Recomendaciones */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
          <Card className="h-full p-5" flat={false}>
            <div className="flex items-center gap-2">
              <Chip color={cat.color}>{cat.label}</Chip>
            </div>
            <h2 className="mt-2 font-display text-xl font-extrabold tracking-tight">{tips.title}</h2>
            <ul className="mt-4 space-y-3">
              {tips.tips.map((t, i) => {
                const Icon = t.icon;
                return (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.12 + i * 0.05 }}
                    className="flex items-start gap-3 rounded-xl border-2 border-ink bg-paper p-3"
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border-2 border-ink bg-white shadow-pop-xs">
                      <Icon className="size-4" strokeWidth={2.2} />
                    </span>
                    <span className="text-[13px] font-medium leading-snug text-ink">{t.text}</span>
                  </motion.li>
                );
              })}
            </ul>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/retos"><Button size="sm" variant="violet"><Target className="size-4" /> Ver mis retos</Button></Link>
              <Link href="/rutinas"><Button size="sm"><Timer className="size-4" /> Micro-rutina de 3 min</Button></Link>
            </div>
            <p className="mt-4 flex items-start gap-2 rounded-xl border-2 border-dashed border-ink/40 bg-white/70 p-3 text-[12px] font-medium text-ink-soft">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              El IMC es una guía general: no distingue músculo de grasa ni sustituye la orientación de un profesional de la salud.
            </p>
          </Card>
        </motion.div>
      </div>

      {/* Historial */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}>
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-extrabold tracking-tight">Tu evolución</h2>
            {metrics && metrics.length > 1 && (
              <Chip color="#FFFFFF" className="tnum">
                {(() => {
                  const delta = metrics[0].weightKg - metrics[metrics.length - 1].weightKg;
                  return delta <= 0 ? `${Math.abs(delta).toFixed(1)} kg menos` : `${delta.toFixed(1)} kg más`;
                })()}
                <span className="font-semibold normal-case text-ink-soft"> desde la primera medición</span>
              </Chip>
            )}
          </div>

          {metrics === null ? (
            <Skeleton className="mt-4 h-48 w-full" />
          ) : metrics.length === 0 ? (
            <div className="mt-4">
              <EmptyState
                icon="Heart"
                color="#FFA9D6"
                title="Sin mediciones todavía"
                hint="Guarda tu primera medición arriba y empieza a ver tu evolución de peso e IMC con el tiempo."
              />
            </div>
          ) : (
            <>
              {chartData.length > 1 ? (
                <div className="mt-4 h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 6, right: 6, left: 0, bottom: 0 }}>
                      <CartesianGrid vertical={false} stroke="rgba(23,20,31,0.1)" />
                      <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: "#55506a" }} />
                      <YAxis hide domain={["dataMin - 1", "dataMax + 1"]} />
                      <Tooltip
                        content={({ active, payload }) =>
                          active && payload?.length ? (
                            <div className="rounded-lg border-2 border-ink bg-white px-2.5 py-1.5 text-xs font-bold shadow-pop-xs">
                              IMC {payload[0].payload.bmi} · {payload[0].payload.peso} kg
                            </div>
                          ) : null
                        }
                      />
                      <Line type="monotone" dataKey="bmi" stroke="#17141F" strokeWidth={3} dot={{ r: 4, fill: "#FFA9D6", stroke: "#17141F", strokeWidth: 2 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="mt-3 text-sm font-medium text-ink-soft">
                  Guarda otra medición en unos días para dibujar tu línea de evolución.
                </p>
              )}

              <ul className="mt-4 divide-y-2 divide-ink/10">
                {metrics.map((m) => {
                  const c = categoryOf(m.bmi);
                  return (
                    <li key={m.id} className="flex items-center gap-3 py-3">
                      <div
                        className="flex size-9 shrink-0 items-center justify-center rounded-lg border-2 border-ink"
                        style={{ background: c.color }}
                      >
                        <Scale className="size-4.5" strokeWidth={2.2} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="tnum text-sm font-bold">
                          {m.weightKg} kg · {m.heightCm} cm · IMC {m.bmi}
                        </p>
                        <p className="text-xs font-bold text-ink-soft">
                          {friendlyDay(m.date)} · {c.label}
                        </p>
                      </div>
                      <DeleteButton small label="" onConfirm={() => remove(m)} />
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </Card>
      </motion.div>
    </div>
  );
}
