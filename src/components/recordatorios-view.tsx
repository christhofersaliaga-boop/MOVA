"use client";

import { motion } from "framer-motion";
import { BellOff, BellRing, DoorOpen, MapPin, Pencil, Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useToast } from "@/components/toaster";
import {
  Button,
  Card,
  Chip,
  DeleteButton,
  EmptyState,
  Field,
  inputCls,
  Modal,
  Segmented,
  Skeleton,
  Toggle,
  cx,
} from "@/components/ui";
import { api } from "@/lib/client/api";
import { DAY_SHORT, minutesToTime, timeToMinutes } from "@/lib/dates";
import { iconByName } from "@/lib/icons";
import type { BlockDTO, ReminderDTO } from "@/lib/types";

const KINDS: Record<string, { icon: string; color: string; label: string }> = {
  break: { icon: "Timer", color: "#C9F24F", label: "Pausa activa" },
  water: { icon: "GlassWater", color: "#6FD6FF", label: "Hidratación" },
  posture: { icon: "PersonStanding", color: "#FFA9D6", label: "Postura" },
  custom: { icon: "BellRing", color: "#FFC84D", label: "Personalizado" },
};

const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const DAY_LETTERS: Record<number, string> = { 1: "L", 2: "M", 3: "X", 4: "J", 5: "V", 6: "S", 0: "D" };
const BLOCK_COLORS = ["#7C6CFF", "#C9F24F", "#6FD6FF", "#FFC84D", "#FF7461", "#FFA9D6", "#8FE388", "#B9A8FF"];

function DayPicker({ value, onChange }: { value: number[]; onChange: (v: number[]) => void }) {
  return (
    <div className="flex gap-1.5">
      {DAY_ORDER.map((d) => {
        const on = value.includes(d);
        return (
          <button
            key={d}
            type="button"
            onClick={() => onChange(on ? value.filter((x) => x !== d) : [...value, d].sort())}
            className={cx(
              "press flex size-9 cursor-pointer items-center justify-center rounded-lg border-2 border-ink font-display text-sm font-extrabold",
              on ? "bg-viola text-white shadow-pop-xs" : "bg-white text-ink-soft"
            )}
          >
            {DAY_LETTERS[d]}
          </button>
        );
      })}
    </div>
  );
}

export function RecordatoriosView() {
  const toast = useToast();
  const [tab, setTab] = useState<"avisos" | "horario">("avisos");
  const [reminders, setReminders] = useState<ReminderDTO[] | null>(null);
  const [blocks, setBlocks] = useState<BlockDTO[] | null>(null);
  const [modalR, setModalR] = useState<
    | { initial?: ReminderDTO; presetTitle?: string; presetTime?: string; presetDays?: number[]; nonce: number }
    | null
  >(null);
  const [modalB, setModalB] = useState(false);
  const [perm, setPerm] = useState<NotificationPermission | "na">("na");

  const load = useCallback(async () => {
    try {
      const [r, b] = await Promise.all([
        api<{ reminders: ReminderDTO[] }>("/api/reminders"),
        api<{ blocks: BlockDTO[] }>("/api/schedule"),
      ]);
      setReminders(r.reminders);
      setBlocks(b.blocks);
    } catch {
      toast.push({ title: "No pudimos cargar tus avisos", tone: "err" });
    }
  }, [toast]);

  useEffect(() => {
    load();
    setPerm(typeof Notification === "undefined" ? "na" : Notification.permission);
  }, [load]);

  async function toggle(r: ReminderDTO, enabled: boolean) {
    const snapshot = reminders;
    setReminders((prev) => (prev ? prev.map((x) => (x.id === r.id ? { ...x, enabled } : x)) : prev));
    try {
      await api(`/api/reminders/${r.id}`, { method: "PATCH", body: JSON.stringify({ enabled }) });
    } catch (e) {
      setReminders(snapshot);
      toast.push({ title: "No se guardó", description: e instanceof Error ? e.message : undefined, tone: "err" });
    }
  }

  async function removeReminder(r: ReminderDTO) {
    const snapshot = reminders;
    setReminders((prev) => (prev ? prev.filter((x) => x.id !== r.id) : prev));
    try {
      await api(`/api/reminders/${r.id}`, { method: "DELETE" });
      toast.push({ title: "Recordatorio eliminado", tone: "warn" });
    } catch (e) {
      setReminders(snapshot);
      toast.push({ title: "No se pudo eliminar", description: e instanceof Error ? e.message : undefined, tone: "err" });
    }
  }

  async function removeBlock(b: BlockDTO) {
    const snapshot = blocks;
    setBlocks((prev) => (prev ? prev.filter((x) => x.id !== b.id) : prev));
    try {
      await api(`/api/schedule/${b.id}`, { method: "DELETE" });
      toast.push({ title: "Bloque eliminado", tone: "warn" });
    } catch (e) {
      setBlocks(snapshot);
      toast.push({ title: "No se pudo eliminar", description: e instanceof Error ? e.message : undefined, tone: "err" });
    }
  }

  const gaps = useMemo(() => {
    const today = new Date().getDay();
    const todays = (blocks ?? []).filter((b) => b.day === today).sort((a, b) => a.startTime.localeCompare(b.startTime));
    const out: { from: number; to: number }[] = [];
    let cursor = 8 * 60;
    for (const b of todays) {
      const s = timeToMinutes(b.startTime);
      const e = timeToMinutes(b.endTime);
      if (s - cursor >= 30) out.push({ from: cursor, to: s });
      cursor = Math.max(cursor, e);
    }
    if (18 * 60 - cursor >= 30) out.push({ from: cursor, to: 18 * 60 });
    return out;
  }, [blocks]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[13px] font-bold uppercase tracking-widest text-ink-soft">Según tu horario</p>
          <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">Recordatorios</h1>
        </div>
        <Button onClick={() => (tab === "avisos" ? setModalR({ nonce: Date.now() }) : setModalB(true))}>
          <Plus className="size-4" /> {tab === "avisos" ? "Nuevo aviso" : "Nueva clase"}
        </Button>
      </div>

      {perm === "default" && (
        <Card className="flex flex-wrap items-center justify-between gap-3 bg-sunny/70 p-4" flat>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl border-2 border-ink bg-white shadow-pop-xs">
              <BellRing className="size-5" strokeWidth={2.4} />
            </div>
            <div>
              <p className="font-display text-[15px] font-extrabold">Activa las notificaciones push</p>
              <p className="text-[13px] font-medium text-ink/70">Así Mova te avisa aunque tengas mil pestañas abiertas.</p>
            </div>
          </div>
          <Button
            size="sm"
            variant="ink"
            onClick={() => Notification.requestPermission().then((p) => setPerm(p))}
          >
            Activar
          </Button>
        </Card>
      )}
      {perm === "denied" && (
        <Card className="flex items-center gap-3 bg-white p-4" flat>
          <BellOff className="size-5 text-ink-soft" />
          <p className="text-[13px] font-semibold text-ink-soft">
            Las notificaciones están bloqueadas en tu navegador. Mova seguirá avisándote dentro de la app.
          </p>
        </Card>
      )}

      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: "avisos", label: "Mis avisos" },
          { value: "horario", label: "Mi horario" },
        ]}
      />

      {tab === "avisos" && (
        <>
          {!reminders ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-20 rounded-2xl" />
              ))}
            </div>
          ) : reminders.length === 0 ? (
            <EmptyState
              icon="BellRing"
              color="#FFC84D"
              title="Sin recordatorios todavía"
              hint="Crea tu primer aviso: una pausa activa entre clases, agua a mediodía o postura en la tarde."
              action={
                <Button size="sm" onClick={() => setModalR({ nonce: Date.now() })}>
                  <Plus className="size-4" /> Crear recordatorio
                </Button>
              }
            />
          ) : (
            <div className="space-y-3">
              {reminders.map((r, i) => {
                const kind = KINDS[r.kind] ?? KINDS.custom;
                const Icon = iconByName(kind.icon);
                return (
                  <motion.div key={r.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                    <Card flat className={cx("flex items-center gap-3 p-4", !r.enabled && "opacity-60")}>
                      <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border-2 border-ink shadow-pop-xs" style={{ background: kind.color }}>
                        <Icon className="size-5" strokeWidth={2.2} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline gap-2">
                          <span className="tnum font-display text-xl font-extrabold">{r.time}</span>
                          <p className="truncate text-sm font-bold">{r.title}</p>
                        </div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1">
                          {DAY_ORDER.map((d) => (
                            <span
                              key={d}
                              className={cx(
                                "flex size-6 items-center justify-center rounded-md border-2 text-[10px] font-extrabold",
                                r.days.includes(d) ? "border-ink bg-limey" : "border-ink/20 bg-paper text-ink-soft/50"
                              )}
                            >
                              {DAY_LETTERS[d]}
                            </span>
                          ))}
                          <Chip color={kind.color} className="ml-1">{kind.label}</Chip>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Toggle checked={r.enabled} onChange={(v) => toggle(r, v)} />
                        <button
                          onClick={() => setModalR({ initial: r, nonce: Date.now() })}
                          className="press flex size-8 cursor-pointer items-center justify-center rounded-lg border-2 border-ink bg-white shadow-pop-xs"
                          aria-label="Editar"
                        >
                          <Pencil className="size-3.5" />
                        </button>
                        <DeleteButton small label="" onConfirm={() => removeReminder(r)} />
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </>
      )}

      {tab === "horario" && (
        <>
          {!blocks ? (
            <Skeleton className="h-40 rounded-2xl" />
          ) : (
            <Card className="p-5">
              <div className="flex items-center gap-2">
                <DoorOpen className="size-5 text-viola" strokeWidth={2.4} />
                <h2 className="font-display text-lg font-extrabold tracking-tight">Huecos libres de hoy</h2>
              </div>
              {blocks.filter((b) => b.day === new Date().getDay()).length === 0 ? (
                <p className="mt-3 text-sm font-medium text-ink-soft">
                  Hoy no tienes clases registradas. Agrega tu horario para detectar huecos ideales para pausas.
                </p>
              ) : gaps.length === 0 ? (
                <p className="mt-3 text-sm font-medium text-ink-soft">
                  Hoy tu día está muy compacto: intenta una rutina corta al terminar.
                </p>
              ) : (
                <div className="mt-3 flex flex-wrap gap-2">
                  {gaps.map((g) => (
                    <button
                      key={g.from}
                      onClick={() =>
                        setModalR({
                          nonce: Date.now(),
                          presetTitle: "Pausa activa (hueco libre)",
                          presetTime: minutesToTime(g.from),
                          presetDays: [new Date().getDay()],
                        })
                      }
                      className="press cursor-pointer rounded-xl border-2 border-ink bg-minty/50 px-3.5 py-2 text-left hover:bg-minty"
                    >
                      <p className="tnum font-display text-sm font-extrabold">
                        {minutesToTime(g.from)} – {minutesToTime(g.to)}
                      </p>
                      <p className="text-[11px] font-bold text-ink-soft">
                        {g.to - g.from} min libres · toca para avisarte aquí
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </Card>
          )}

          {!blocks ? (
            <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
          ) : blocks.length === 0 ? (
            <EmptyState
              icon="BookOpen"
              color="#B9A8FF"
              title="Tu horario está vacío"
              hint="Agrega tus clases y Mova encontrará los mejores momentos para moverte."
              action={
                <Button size="sm" onClick={() => setModalB(true)}>
                  <Plus className="size-4" /> Agregar clase
                </Button>
              }
            />
          ) : (
            <div className="space-y-4">
              {DAY_ORDER.map((d) => {
                const dayBlocks = (blocks ?? []).filter((b) => b.day === d);
                if (dayBlocks.length === 0) return null;
                return (
                  <div key={d}>
                    <Chip color="#FFFFFF">{new Date().getDay() === d ? `${DAY_SHORT[d]} · hoy` : DAY_SHORT[d]}</Chip>
                    <div className="mt-2 space-y-2">
                      {dayBlocks.map((b) => (
                        <Card key={b.id} flat className="flex items-center gap-0 overflow-hidden p-0">
                          <div className="w-2.5 self-stretch border-r-2 border-ink" style={{ background: b.color }} />
                          <div className="flex min-w-0 flex-1 items-center gap-3 p-3.5">
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-display text-[15px] font-extrabold">{b.title}</p>
                              <p className="tnum text-xs font-bold text-ink-soft">
                                {b.startTime} – {b.endTime}
                                {b.location && (
                                  <span className="ml-1.5 inline-flex items-center gap-0.5">
                                    <MapPin className="size-3" /> {b.location}
                                  </span>
                                )}
                              </p>
                            </div>
                            <DeleteButton small label="" onConfirm={() => removeBlock(b)} />
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {modalR && (
        <ReminderModal
          key={modalR.nonce}
          initial={modalR.initial}
          presetTitle={modalR.presetTitle}
          presetTime={modalR.presetTime}
          presetDays={modalR.presetDays}
          onClose={() => setModalR(null)}
          onSaved={(saved, isNew) => {
            setModalR(null);
            setReminders((prev) => {
              if (!prev) return [saved];
              return isNew ? [...prev, saved].sort((a, b) => a.time.localeCompare(b.time)) : prev.map((x) => (x.id === saved.id ? saved : x));
            });
            toast.push({ title: isNew ? "Recordatorio creado" : "Recordatorio actualizado", tone: "ok" });
          }}
        />
      )}
      {modalB && (
        <BlockModal
          onClose={() => setModalB(false)}
          onSaved={(b) => {
            setModalB(false);
            setBlocks((prev) => (prev ? [...prev, b] : [b]));
            toast.push({ title: "Clase agregada", description: b.title, tone: "ok" });
          }}
        />
      )}
    </div>
  );
}

function ReminderModal({
  initial,
  presetTitle,
  presetTime,
  presetDays,
  onClose,
  onSaved,
}: {
  initial?: ReminderDTO;
  presetTitle?: string;
  presetTime?: string;
  presetDays?: number[];
  onClose: () => void;
  onSaved: (r: ReminderDTO, isNew: boolean) => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? presetTitle ?? "");
  const [time, setTime] = useState(initial?.time ?? presetTime ?? "10:30");
  const [kind, setKind] = useState(initial?.kind ?? "break");
  const [days, setDays] = useState<number[]>(initial?.days ?? presetDays ?? [1, 2, 3, 4, 5]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const payload = { title, time, kind, days };
      const res = initial
        ? await api<{ reminder: ReminderDTO }>(`/api/reminders/${initial.id}`, { method: "PATCH", body: JSON.stringify(payload) })
        : await api<{ reminder: ReminderDTO }>("/api/reminders", { method: "POST", body: JSON.stringify(payload) });
      onSaved(res.reminder, !initial);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
      setBusy(false);
    }
  }

  return (
    <Modal open onClose={onClose} title={initial ? "Editar recordatorio" : "Nuevo recordatorio"}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Nombre">
          <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej. Pausa activa" required />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Hora">
            <input className={inputCls} type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
          </Field>
          <Field label="Tipo">
            <select className={inputCls} value={kind} onChange={(e) => setKind(e.target.value)}>
              {Object.entries(KINDS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Días de la semana">
          <DayPicker value={days} onChange={setDays} />
        </Field>
        {error && <p className="text-sm font-bold text-coral">{error}</p>}
        <Button type="submit" className="w-full" size="lg" loading={busy}>
          {initial ? "Guardar cambios" : "Crear recordatorio"}
        </Button>
      </form>
    </Modal>
  );
}

function BlockModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: (b: BlockDTO) => void;
}) {
  const [title, setTitle] = useState("");
  const [day, setDay] = useState(new Date().getDay());
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("09:30");
  const [location, setLocation] = useState("");
  const [color, setColor] = useState(BLOCK_COLORS[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ block: BlockDTO }>("/api/schedule", {
        method: "POST",
        body: JSON.stringify({ title, day, startTime, endTime, location, color }),
      });
      onSaved(res.block);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
      setBusy(false);
    }
  }

  return (
    <Modal open onClose={onClose} title="Agregar clase o bloque">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Nombre de la clase">
          <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej. Cálculo I" required />
        </Field>
        <Field label="Día">
          <div className="flex gap-1.5">
            {DAY_ORDER.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDay(d)}
                className={cx(
                  "press flex size-9 cursor-pointer items-center justify-center rounded-lg border-2 border-ink font-display text-sm font-extrabold",
                  day === d ? "bg-viola text-white shadow-pop-xs" : "bg-white text-ink-soft"
                )}
              >
                {DAY_LETTERS[d]}
              </button>
            ))}
          </div>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Empieza">
            <input className={inputCls} type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
          </Field>
          <Field label="Termina">
            <input className={inputCls} type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required />
          </Field>
        </div>
        <Field label="Salón (opcional)">
          <input className={inputCls} value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Ej. Aula 204" />
        </Field>
        <Field label="Color">
          <div className="flex flex-wrap gap-2">
            {BLOCK_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={cx("press size-9 cursor-pointer rounded-lg border-2", color === c ? "border-ink shadow-pop-xs" : "border-ink/30")}
                style={{ background: c }}
                aria-label={`Color ${c}`}
              />
            ))}
          </div>
        </Field>
        {error && <p className="text-sm font-bold text-coral">{error}</p>}
        <Button type="submit" className="w-full" size="lg" loading={busy}>
          Guardar en mi horario
        </Button>
      </form>
    </Modal>
  );
}
