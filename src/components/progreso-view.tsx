"use client";

import { motion } from "framer-motion";
import { Dumbbell, Footprints, Timer, TrendingUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { LevelUpModal } from "@/components/level-up";
import { ActivityRow } from "@/components/dashboard-home";
import { useToast } from "@/components/toaster";
import { Card, Chip, DeleteButton, EmptyState, Segmented, Skeleton } from "@/components/ui";
import { api } from "@/lib/client/api";
import { friendlyDay, labelFor, lastNDays, parseKey } from "@/lib/dates";
import type { ActivityDTO, GamificationState, StatsResponse } from "@/lib/types";

type Range = "7" | "30" | "70";

export function ProgresoView() {
  const toast = useToast();
  const router = useRouter();
  const [activities, setActivities] = useState<ActivityDTO[] | null>(null);
  const [totals, setTotals] = useState<StatsResponse["totals"] | null>(null);
  const [range, setRange] = useState<Range>("7");
  const [levelUp, setLevelUp] = useState<number | null>(null);
  const levelRef = useRef<number | null>(null);

  const load = useCallback(async () => {
    try {
      const [a, s] = await Promise.all([
        api<{ activities: ActivityDTO[] }>("/api/activities?days=70"),
        api<StatsResponse>("/api/stats"),
      ]);
      setActivities(a.activities);
      setTotals(s.totals);
      levelRef.current ??= s.user.level;
    } catch {
      toast.push({ title: "No pudimos cargar tu progreso", tone: "err" });
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const byDay = useMemo(() => {
    const map = new Map<string, { minutes: number; steps: number }>();
    for (const a of activities ?? []) {
      const cur = map.get(a.date) ?? { minutes: 0, steps: 0 };
      cur.minutes += a.minutes;
      cur.steps += a.steps;
      map.set(a.date, cur);
    }
    return map;
  }, [activities]);

  const chartData = useMemo(
    () =>
      lastNDays(Number(range)).map((key) => ({
        key,
        label: range === "7" ? labelFor(key) : key.slice(8),
        minutes: byDay.get(key)?.minutes ?? 0,
        steps: byDay.get(key)?.steps ?? 0,
      })),
    [byDay, range]
  );

  const best = useMemo(
    () =>
      chartData.reduce(
        (acc, d) => (d.minutes > acc.minutes ? d : acc),
        { key: "", label: "", minutes: 0, steps: 0 }
      ),
    [chartData]
  );

  const heatDays = useMemo(() => lastNDays(70), []);
  const firstPad = (parseKey(heatDays[0]).getDay() + 6) % 7;

  async function removeActivity(a: ActivityDTO) {
    const snapshot = activities;
    setActivities((prev) => (prev ? prev.filter((x) => x.id !== a.id) : prev));
    try {
      const res = await api<{ game?: GamificationState & { streak?: number } }>(
        `/api/activities/${a.id}`,
        { method: "DELETE" }
      );
      toast.push({ title: "Registro eliminado", description: a.title, tone: "warn" });
      if (res.game) {
        if (levelRef.current !== null && res.game.level > levelRef.current) setLevelUp(res.game.level);
        levelRef.current = res.game.level;
      }
      router.refresh();
      api<StatsResponse>("/api/stats").then((s) => setTotals(s.totals)).catch(() => {});
    } catch (e) {
      setActivities(snapshot);
      toast.push({ title: "No se pudo eliminar", description: e instanceof Error ? e.message : undefined, tone: "err" });
    }
  }

  const grouped = useMemo(() => {
    const map = new Map<string, ActivityDTO[]>();
    for (const a of (activities ?? []).slice(0, 60)) {
      const list = map.get(a.date) ?? [];
      list.push(a);
      map.set(a.date, list);
    }
    return [...map.entries()].sort((x, y) => (x[0] < y[0] ? 1 : -1));
  }, [activities]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[13px] font-bold uppercase tracking-widest text-ink-soft">Tu registro visual</p>
          <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">Progreso</h1>
        </div>
        <Segmented<Range>
          value={range}
          onChange={setRange}
          options={[
            { value: "7", label: "7 días" },
            { value: "30", label: "30 días" },
            { value: "70", label: "10 sem." },
          ]}
        />
      </div>

      {/* resumen */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {[
          { label: "Minutos totales", value: totals?.minutes ?? null, icon: Timer, color: "#C9F24F" },
          { label: "Pasos totales", value: totals?.steps ?? null, icon: Footprints, color: "#6FD6FF" },
          { label: "Micro-rutinas", value: totals?.routines ?? null, icon: Dumbbell, color: "#B9A8FF" },
          { label: "Mejor día (min)", value: best.minutes || null, icon: TrendingUp, color: "#FFC84D" },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label} flat className="p-4">
              <div className="flex size-9 items-center justify-center rounded-lg border-2 border-ink" style={{ background: s.color }}>
                <Icon className="size-4.5" strokeWidth={2.4} />
              </div>
              {s.value === null ? (
                <Skeleton className="mt-3 h-7 w-16" />
              ) : (
                <p className="tnum mt-3 font-display text-2xl font-extrabold leading-none">
                  {s.value.toLocaleString("es-MX")}
                </p>
              )}
              <p className="mt-1 text-xs font-bold uppercase tracking-wider text-ink-soft">{s.label}</p>
            </Card>
          );
        })}
      </div>

      {/* charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="font-display text-lg font-extrabold tracking-tight">Minutos activos</h2>
          <div className="mt-3 h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 6, right: 0, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="rgba(23,20,31,0.1)" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: "#55506a" }} interval={range === "7" ? 0 : range === "30" ? 4 : 9} />
                <YAxis hide domain={[0, "dataMax + 10"]} />
                <Tooltip
                  cursor={{ fill: "rgba(23,20,31,0.06)" }}
                  content={({ active, payload }) =>
                    active && payload?.length ? (
                      <div className="rounded-lg border-2 border-ink bg-white px-2.5 py-1.5 text-xs font-bold shadow-pop-xs">
                        {payload[0].payload.minutes} min activos
                      </div>
                    ) : null
                  }
                />
                <Bar dataKey="minutes" radius={[6, 6, 0, 0]} stroke="#17141F" strokeWidth={range === "7" ? 2 : 0} fill="#7C6CFF">
                  {chartData.map((d, i) => (
                    <Cell key={d.key} fill={i === chartData.length - 1 ? "#C9F24F" : "#7C6CFF"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="font-display text-lg font-extrabold tracking-tight">Pasos diarios</h2>
          <div className="mt-3 h-52">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 6, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradSteps" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6FD6FF" stopOpacity={0.85} />
                    <stop offset="100%" stopColor="#6FD6FF" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="rgba(23,20,31,0.1)" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: "#55506a" }} interval={range === "7" ? 0 : range === "30" ? 4 : 9} />
                <YAxis hide domain={[0, "dataMax + 400"]} />
                <Tooltip
                  content={({ active, payload }) =>
                    active && payload?.length ? (
                      <div className="rounded-lg border-2 border-ink bg-white px-2.5 py-1.5 text-xs font-bold shadow-pop-xs">
                        {Number(payload[0].value).toLocaleString("es-MX")} pasos
                      </div>
                    ) : null
                  }
                />
                <Area type="monotone" dataKey="steps" stroke="#17141F" strokeWidth={2.5} fill="url(#gradSteps)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* heatmap */}
      <Card className="p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-extrabold tracking-tight">Mapa de constancia</h2>
          <Chip color="#FFFFFF">Últimas 10 semanas</Chip>
        </div>
        {!activities ? (
          <Skeleton className="mt-4 h-28 w-full" />
        ) : (
          <>
            <div className="mt-4 grid grid-flow-col grid-rows-7 gap-1.5 overflow-x-auto pb-1">
              {Array.from({ length: firstPad }).map((_, i) => (
                <div key={`pad-${i}`} className="size-4 rounded-[5px] sm:size-5" />
              ))}
              {heatDays.map((key) => {
                const m = byDay.get(key)?.minutes ?? 0;
                const bg =
                  m === 0 ? "rgba(23,20,31,0.07)" : m < 15 ? "#DCF2B8" : m < 30 ? "#C9F24F" : m < 50 ? "#8FE388" : "#7C6CFF";
                return (
                  <div
                    key={key}
                    title={`${friendlyDay(key)} · ${m} min`}
                    className="size-4 rounded-[5px] border border-ink/20 sm:size-5"
                    style={{ background: bg }}
                  />
                );
              })}
            </div>
            <div className="mt-3 flex items-center justify-end gap-1.5 text-[10px] font-bold uppercase tracking-wider text-ink-soft">
              Menos
              {["rgba(23,20,31,0.07)", "#DCF2B8", "#C9F24F", "#8FE388", "#7C6CFF"].map((c) => (
                <span key={c} className="size-3 rounded-[4px] border border-ink/20" style={{ background: c }} />
              ))}
              Más
            </div>
          </>
        )}
      </Card>

      {/* historial */}
      <Card className="p-5">
        <h2 className="font-display text-lg font-extrabold tracking-tight">Historial</h2>
        {!activities ? (
          <div className="mt-4 space-y-2.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : grouped.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              icon="Footprints"
              color="#6FD6FF"
              title="Tu historial empieza hoy"
              hint="Registra una caminata, suma pasos o completa una micro-rutina y aparecerá aquí."
            />
          </div>
        ) : (
          <div className="mt-4 space-y-5">
            {grouped.map(([date, list]) => (
              <div key={date}>
                <div className="flex items-center gap-2">
                  <Chip color="#FFC84D">{friendlyDay(date)}</Chip>
                  <span className="text-xs font-bold text-ink-soft">
                    {list.reduce((s, a) => s + a.minutes, 0)} min · {list.reduce((s, a) => s + a.steps, 0).toLocaleString("es-MX")} pasos
                  </span>
                </div>
                <ul className="mt-2 divide-y-2 divide-ink/10">
                  {list.map((a) => (
                    <li key={a.id} className="flex items-center gap-1">
                      <div className="min-w-0 flex-1">
                        <ActivityRow a={a} />
                      </div>
                      <DeleteButton small label="" onConfirm={() => removeActivity(a)} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </Card>

      <LevelUpModal level={levelUp} onClose={() => setLevelUp(null)} />
    </div>
  );
}
