"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  BellRing,
  BookOpen,
  Dumbbell,
  Footprints,
  Flame,
  Scale,
  Search,
  ShieldCheck,
  Target,
  Timer,
  Users,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { ActivityRow } from "@/components/dashboard-home";
import { useToast } from "@/components/toaster";
import {
  AvatarBubble,
  Card,
  Chip,
  DeleteButton,
  EmptyState,
  Modal,
  Skeleton,
  cx,
} from "@/components/ui";
import { api } from "@/lib/client/api";
import { friendlyDay, todayKey } from "@/lib/dates";
import type { AdminUserDTO, AdminUserDetailDTO } from "@/lib/types";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
}

function lastActiveLabel(key: string | null) {
  if (!key) return "nunca";
  return friendlyDay(key).toLowerCase();
}

function bmiChipColor(bmi: number | null) {
  if (bmi === null) return "#FFFFFF";
  if (bmi < 18.5) return "#6FD6FF";
  if (bmi < 25) return "#8FE388";
  if (bmi < 30) return "#FFC84D";
  return "#FF7461";
}

export function AdminView({ adminId }: { adminId: number }) {
  const toast = useToast();
  const [users, setUsers] = useState<AdminUserDTO[] | null>(null);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<AdminUserDetailDTO | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api<{ users: AdminUserDTO[] }>("/api/admin/users");
      setUsers(data.users);
    } catch {
      toast.push({ title: "No pudimos cargar los usuarios", tone: "err" });
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (selectedId === null) return;
    setLoadingDetail(true);
    setDetail(null);
    api<AdminUserDetailDTO>(`/api/admin/users/${selectedId}`)
      .then(setDetail)
      .catch((e) => {
        toast.push({ title: "No se pudo abrir el historial", description: e instanceof Error ? e.message : undefined, tone: "err" });
        setSelectedId(null);
      })
      .finally(() => setLoadingDetail(false));
  }, [selectedId, toast]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users ?? [];
    return (users ?? []).filter(
      (u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    );
  }, [users, query]);

  const summary = useMemo(() => {
    const all = users ?? [];
    return {
      total: all.length,
      activeToday: all.filter((u) => u.activeToday).length,
      steps: all.reduce((s, u) => s + u.totals.steps, 0),
      minutes: all.reduce((s, u) => s + u.totals.minutes, 0),
      newThisWeek: all.filter(
        (u) => Date.now() - new Date(u.createdAt).getTime() < 7 * 86400000
      ).length,
    };
  }, [users]);

  async function removeUser(u: AdminUserDTO) {
    const snapshot = users;
    setUsers((prev) => (prev ? prev.filter((x) => x.id !== u.id) : prev));
    setSelectedId(null);
    try {
      await api(`/api/admin/users/${u.id}`, { method: "DELETE" });
      toast.push({ title: "Usuario eliminado", description: u.email, tone: "warn" });
    } catch (e) {
      setUsers(snapshot);
      toast.push({ title: "No se pudo eliminar", description: e instanceof Error ? e.message : undefined, tone: "err" });
    }
  }

  const selected = users?.find((u) => u.id === selectedId) ?? null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[13px] font-bold uppercase tracking-widest text-ink-soft">Control de la app</p>
          <h1 className="mt-1 flex items-center gap-2 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
            <ShieldCheck className="size-8 text-viola" /> Administración
          </h1>
        </div>
        <Chip color="#FFC84D">{todayKey() === new Date().toISOString().slice(0, 10) ? "Hoy" : "Hoy"}</Chip>
      </div>

      {/* resumen */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5 lg:gap-4">
        {[
          { label: "Registrados", value: summary.total, icon: Users, color: "#B9A8FF" },
          { label: "Activos hoy", value: summary.activeToday, icon: Flame, color: "#FF7461" },
          { label: "Nuevos 7 días", value: summary.newThisWeek, icon: Zap, color: "#C9F24F" },
          { label: "Pasos totales", value: summary.steps, icon: Footprints, color: "#6FD6FF" },
          { label: "Minutos totales", value: summary.minutes, icon: Timer, color: "#FFC84D" },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label} flat className="p-4">
              <div className="flex size-9 items-center justify-center rounded-lg border-2 border-ink" style={{ background: s.color }}>
                <Icon className="size-4.5" strokeWidth={2.4} />
              </div>
              {users === null ? (
                <Skeleton className="mt-3 h-7 w-14" />
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

      {/* búsqueda */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 size-4.5 -translate-y-1/2 text-ink-soft" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nombre o correo…"
          className="h-12 w-full rounded-xl border-2 border-ink bg-white pl-11 pr-4 text-sm font-medium shadow-pop-xs outline-none placeholder:text-ink-soft/50 focus:shadow-pop-sm"
        />
      </div>

      {/* lista */}
      {users === null ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="Users"
          color="#B9A8FF"
          title={query ? "Sin resultados" : "Aún no hay usuarios"}
          hint={query ? `Nadie coincide con "${query}".` : "Cuando alguien se registre aparecerá aquí."}
        />
      ) : (
        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {filtered.map((u, i) => (
              <motion.button
                key={u.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ delay: i * 0.02 }}
                onClick={() => setSelectedId(u.id)}
                className="press block w-full cursor-pointer rounded-2xl border-2 border-ink bg-white p-4 text-left shadow-pop hover:bg-limey/10"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <AvatarBubble id={u.avatar} size={52} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="font-display text-base font-extrabold leading-tight">{u.name}</p>
                      {u.isAdmin && <Chip color="#FFC84D">Admin</Chip>}
                      {u.activeToday && <Chip color="#C9F24F">Activo hoy</Chip>}
                    </div>
                    <p className="truncate text-[13px] font-semibold text-ink-soft">{u.email}</p>
                    <p className="mt-1 text-xs font-bold text-ink-soft">
                      Registro: {fmtDate(u.createdAt)} · Última actividad: {lastActiveLabel(u.lastActiveDate)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Chip color="#B9A8FF">Nivel {u.level}</Chip>
                    <Chip color="#FFF">
                      <Flame className="size-3.5 text-coral" /> {u.streak}
                    </Chip>
                    <Chip color="#6FD6FF" className="tnum">
                      <Footprints className="size-3.5" /> {u.totals.steps.toLocaleString("es-MX")}
                    </Chip>
                    <Chip color="#FFF" className="tnum">
                      <Timer className="size-3.5" /> {u.totals.minutes} min
                    </Chip>
                    {u.latestBmi !== null && (
                      <Chip color={bmiChipColor(u.latestBmi)} className="tnum">
                        <Scale className="size-3.5" /> IMC {u.latestBmi}
                      </Chip>
                    )}
                  </div>
                </div>
              </motion.button>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* detalle */}
      <Modal
        open={selectedId !== null}
        onClose={() => setSelectedId(null)}
        title={detail ? `Historial de ${detail.user.name}` : selected ? `Historial de ${selected.name}` : "Historial"}
        wide
      >
        {loadingDetail || !detail ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : (
          <AdminDetailBody
            detail={detail}
            isSelf={detail.user.id === adminId}
            onDelete={() => removeUser(detail.user)}
          />
        )}
      </Modal>
    </div>
  );
}

function AdminDetailBody({
  detail,
  isSelf,
  onDelete,
}: {
  detail: AdminUserDetailDTO;
  isSelf: boolean;
  onDelete: () => void;
}) {
  const { user: u } = detail;
  return (
    <div className="space-y-5">
      {/* identidad */}
      <div className="flex flex-wrap items-center gap-4 rounded-2xl border-2 border-ink bg-ink p-4 text-paper">
        <AvatarBubble id={u.avatar} size={64} />
        <div className="min-w-0 flex-1">
          <p className="font-display text-xl font-extrabold">{u.name}</p>
          <p className="truncate text-sm font-semibold text-paper/70">{u.email}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Chip color="#B9A8FF">Nivel {u.level}</Chip>
            <Chip color="#FFC84D" className="tnum">{u.xp} XP</Chip>
            <Chip color="#FF7461">
              <Flame className="size-3.5" /> {u.streak} días
            </Chip>
            <Chip color="#FFFFFF">Registrado: {fmtDate(u.createdAt)}</Chip>
          </div>
        </div>
      </div>

      {/* stats */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {[
          { label: "Minutos activos", value: u.totals.minutes, icon: Timer },
          { label: "Pasos", value: u.totals.steps, icon: Footprints },
          { label: "Micro-rutinas", value: u.totals.routines, icon: Dumbbell },
          { label: "Retos hechos", value: `${u.challengesDone}/${u.challengesTotal}`, icon: Target, raw: true },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="rounded-xl border-2 border-ink bg-white p-3">
              <Icon className="size-4 text-viola" strokeWidth={2.4} />
              <p className="tnum mt-2 font-display text-xl font-extrabold leading-none">
                {"raw" in s && s.raw ? s.value : Number(s.value).toLocaleString("es-MX")}
              </p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-ink-soft">{s.label}</p>
            </div>
          );
        })}
      </div>

      {/* configuración del usuario */}
      <div className="flex flex-wrap gap-1.5">
        <Chip color="#FFFFFF"><BellRing className="size-3.5" /> {detail.remindersCount} avisos</Chip>
        <Chip color="#FFFFFF"><BookOpen className="size-3.5" /> {detail.blocksCount} bloques en horario</Chip>
        <Chip color="#FFFFFF">{detail.avatars.length} avatares</Chip>
        {u.latestBmi !== null && (
          <Chip color={bmiChipColor(u.latestBmi)} className="tnum"><Scale className="size-3.5" /> {u.latestWeight} kg · IMC {u.latestBmi}</Chip>
        )}
      </div>

      {/* avatares desbloqueados */}
      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-soft">Avatares desbloqueados</p>
        <div className="flex flex-wrap gap-2">
          {detail.avatars.map((id) => (
            <AvatarBubble key={id} id={id} size={40} />
          ))}
        </div>
      </div>

      {/* gráfica 14 días */}
      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-soft">Últimos 14 días (minutos activos)</p>
        <div className="h-40 rounded-xl border-2 border-ink bg-white p-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={detail.daySeries} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: "#55506a" }} />
              <Tooltip
                cursor={{ fill: "rgba(23,20,31,0.06)" }}
                content={({ active, payload }) =>
                  active && payload?.length ? (
                    <div className="rounded-lg border-2 border-ink bg-white px-2.5 py-1.5 text-xs font-bold shadow-pop-xs">
                      {payload[0].payload.minutes} min · {payload[0].payload.steps.toLocaleString("es-MX")} pasos
                    </div>
                  ) : null
                }
              />
              <Bar dataKey="minutes" radius={[4, 4, 0, 0]}>
                {detail.daySeries.map((d) => (
                  <Cell key={d.key} fill={d.key === todayKey() ? "#7C6CFF" : "#C9F24F"} stroke="#17141F" strokeWidth={1.5} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* actividad reciente */}
      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-soft">Movimientos recientes</p>
        {detail.recent.length === 0 ? (
          <p className="rounded-xl border-2 border-dashed border-ink/40 bg-white/60 p-4 text-center text-sm font-medium text-ink-soft">
            Todavía no registra movimiento.
          </p>
        ) : (
          <ul className="divide-y-2 divide-ink/10 rounded-xl border-2 border-ink bg-white px-3">
            {detail.recent.map((a) => (
              <ActivityRow key={a.id} a={a} />
            ))}
          </ul>
        )}
      </div>

      {/* mediciones */}
      {detail.metrics.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-soft">Mediciones corporales</p>
          <ul className="space-y-1.5">
            {detail.metrics.map((m) => (
              <li key={m.id} className="tnum flex items-center justify-between rounded-lg border-2 border-ink bg-white px-3 py-2 text-sm font-bold">
                <span>{m.weightKg} kg · {m.heightCm} cm · IMC {m.bmi}</span>
                <Chip color={bmiChipColor(m.bmi)}>{friendlyDay(m.date)}</Chip>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* zona peligrosa */}
      <div className={cx("flex items-center justify-between gap-3 rounded-xl border-2 border-ink p-4", isSelf ? "bg-paper" : "bg-coral/15")}>
        <div>
          <p className="font-display text-sm font-extrabold">Eliminar cuenta</p>
          <p className="text-xs font-semibold text-ink-soft">
            {isSelf ? "No puedes eliminar tu propia cuenta de administrador." : "Borra su cuenta y todo su historial. No se puede deshacer."}
          </p>
        </div>
        {!isSelf && <DeleteButton label="Eliminar" onConfirm={onDelete} />}
      </div>
    </div>
  );
}
