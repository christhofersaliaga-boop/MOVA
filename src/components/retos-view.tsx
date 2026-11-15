"use client";

import { motion } from "framer-motion";
import { Check, Plus, RotateCcw, Trophy } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { LevelUpModal } from "@/components/level-up";
import { markMovement } from "@/components/reminder-watcher";
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
  ProgressBar,
  Segmented,
  Skeleton,
} from "@/components/ui";
import { api } from "@/lib/client/api";
import { ICON_CHOICES, iconByName } from "@/lib/icons";
import type { ChallengeDTO, GamificationState } from "@/lib/types";

const TIER_LABEL: Record<string, { label: string; color: string }> = {
  facil: { label: "Accesible", color: "#8FE388" },
  medio: { label: "Medio", color: "#6FD6FF" },
  pro: { label: "Pro", color: "#FFA9D6" },
  custom: { label: "Tuyo", color: "#FFC84D" },
};

type Filter = "activos" | "completados" | "todos";

export function RetosView() {
  const toast = useToast();
  const router = useRouter();
  const [items, setItems] = useState<ChallengeDTO[] | null>(null);
  const [filter, setFilter] = useState<Filter>("activos");
  const [modal, setModal] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [levelUp, setLevelUp] = useState<number | null>(null);
  const levelRef = useRef<number | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await api<{ challenges: ChallengeDTO[] }>("/api/challenges");
      setItems(data.challenges);
      api<{ user: { level: number } }>("/api/stats")
        .then((s) => {
          levelRef.current ??= s.user.level;
        })
        .catch(() => {});
    } catch {
      toast.push({ title: "No pudimos cargar tus retos", tone: "err" });
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  function applyGame(game?: GamificationState | null) {
    if (!game) return;
    if (levelRef.current !== null && game.level > levelRef.current) setLevelUp(game.level);
    levelRef.current = game.level;
    router.refresh();
  }

  async function bump(c: ChallengeDTO, amount: number) {
    if (busyId) return;
    setBusyId(c.id);
    const snapshot = items;
    setItems((prev) =>
      prev
        ? prev.map((x) =>
            x.id === c.id
              ? { ...x, progress: Math.min(x.target, x.progress + amount), completed: x.progress + amount >= x.target }
              : x
          )
        : prev
    );
    try {
      const res = await api<{ challenge: ChallengeDTO; game: GamificationState | null }>(
        `/api/challenges/${c.id}`,
        { method: "PATCH", body: JSON.stringify({ op: "increment", amount }) }
      );
      markMovement();
      applyGame(res.game ?? undefined);
      if (res.challenge.completed && !c.completed) {
        toast.push({ title: `¡Reto completado! +${res.challenge.xp} XP`, description: res.challenge.title, tone: "ok" });
      }
      setItems((prev) => (prev ? prev.map((x) => (x.id === c.id ? res.challenge : x)) : prev));
    } catch (e) {
      setItems(snapshot);
      toast.push({ title: "No se guardó", description: e instanceof Error ? e.message : undefined, tone: "err" });
    } finally {
      setBusyId(null);
    }
  }

  async function undo(c: ChallengeDTO) {
    if (busyId) return;
    setBusyId(c.id);
    const snapshot = items;
    setItems((prev) => (prev ? prev.map((x) => (x.id === c.id ? { ...x, progress: 0, completed: false } : x)) : prev));
    try {
      const res = await api<{ challenge: ChallengeDTO; game: GamificationState | null }>(
        `/api/challenges/${c.id}`,
        { method: "PATCH", body: JSON.stringify({ op: "set", value: 0 }) }
      );
      applyGame(res.game ?? undefined);
      setItems((prev) => (prev ? prev.map((x) => (x.id === c.id ? res.challenge : x)) : prev));
    } catch (e) {
      setItems(snapshot);
      toast.push({ title: "No se pudo reiniciar", description: e instanceof Error ? e.message : undefined, tone: "err" });
    } finally {
      setBusyId(null);
    }
  }

  async function remove(c: ChallengeDTO) {
    const snapshot = items;
    setItems((prev) => (prev ? prev.filter((x) => x.id !== c.id) : prev));
    try {
      await api(`/api/challenges/${c.id}`, { method: "DELETE" });
      toast.push({ title: "Reto eliminado", tone: "warn" });
    } catch (e) {
      setItems(snapshot);
      toast.push({ title: "No se pudo eliminar", description: e instanceof Error ? e.message : undefined, tone: "err" });
    }
  }

  const done = (items ?? []).filter((c) => c.completed).length;
  const availableXp = (items ?? []).filter((c) => !c.completed).reduce((s, c) => s + c.xp, 0);
  const visible = (items ?? []).filter((c) =>
    filter === "activos" ? !c.completed : filter === "completados" ? c.completed : true
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[13px] font-bold uppercase tracking-widest text-ink-soft">Metas de hoy</p>
          <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">Retos diarios</h1>
        </div>
        <Button onClick={() => setModal(true)}>
          <Plus className="size-4" /> Nuevo reto
        </Button>
      </div>

      <Card className="flex flex-wrap items-center justify-between gap-4 bg-viola p-5 text-white">
        <div className="flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-xl border-2 border-ink bg-white text-ink shadow-pop-xs">
            <Trophy className="size-6" strokeWidth={2.2} />
          </div>
          <div>
            <p className="font-display text-lg font-extrabold leading-tight">
              {items ? `${done} de ${items.length} retos completados` : "Cargando retos…"}
            </p>
            <p className="text-[13px] font-bold text-white/80">
              {availableXp > 0 ? `Aún puedes ganar ${availableXp} XP hoy` : "¡Barrida completa! Vuelve mañana por más."}
            </p>
          </div>
        </div>
        {items && (
          <ProgressBar
            value={done}
            max={Math.max(1, items.length)}
            color="#C9F24F"
            height={12}
            className="w-full sm:w-56"
          />
        )}
      </Card>

      <Segmented<Filter>
        value={filter}
        onChange={setFilter}
        options={[
          { value: "activos", label: "Activos" },
          { value: "completados", label: "Hechos" },
          { value: "todos", label: "Todos" },
        ]}
      />

      {!items ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-2xl" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <EmptyState
          icon={filter === "completados" ? "Medal" : "Target"}
          color="#C9F24F"
          title={filter === "completados" ? "Aún no completas retos hoy" : "Sin retos por aquí"}
          hint={
            filter === "completados"
              ? "Cada reto terminado aparece aquí con su XP. Tú puedes."
              : "Crea tu propio reto personalizado y empieza a sumar."
          }
          action={
            <Button size="sm" onClick={() => setModal(true)}>
              <Plus className="size-4" /> Crear reto
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {visible.map((c, i) => {
            const Icon = iconByName(c.icon);
            const tier = TIER_LABEL[c.tier] ?? TIER_LABEL.custom;
            const amount = c.unit === "pasos" ? 100 : 1;
            return (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <Card flat className={`p-4 ${c.completed ? "bg-limey/20" : ""}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`flex size-11 shrink-0 items-center justify-center rounded-xl border-2 border-ink shadow-pop-xs ${i % 2 ? "rotate-2" : "-rotate-2"}`} style={{ background: tier.color }}>
                        <Icon className="size-5.5" strokeWidth={2.2} />
                      </div>
                      <div>
                        <p className="font-display text-[15px] font-extrabold leading-tight">{c.title}</p>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          <Chip color={tier.color}>{tier.label}</Chip>
                          <Chip color="#FFFFFF" className="tnum">+{c.xp} XP</Chip>
                        </div>
                      </div>
                    </div>
                  </div>
                  {c.description && (
                    <p className="mt-2.5 text-[13px] font-medium leading-snug text-ink-soft">{c.description}</p>
                  )}
                  <div className="mt-3">
                    <ProgressBar value={c.progress} max={c.target} color={c.completed ? "#8FE388" : "#7C6CFF"} height={10} />
                    <div className="tnum mt-1.5 flex items-center justify-between text-xs font-bold text-ink-soft">
                      <span>
                        {c.progress}/{c.target} {c.unit}
                      </span>
                      <span>{Math.round((c.progress / c.target) * 100)}%</span>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    {c.completed ? (
                      <>
                        <span className="press inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl border-2 border-ink bg-minty font-display text-[13px] font-extrabold shadow-pop-xs">
                          <Check className="size-4" strokeWidth={3} /> Completado
                        </span>
                        <button
                          onClick={() => undo(c)}
                          disabled={busyId === c.id}
                          className="press flex size-9 cursor-pointer items-center justify-center rounded-xl border-2 border-ink bg-white shadow-pop-xs disabled:opacity-50"
                          title="Reiniciar progreso"
                        >
                          <RotateCcw className="size-4" />
                        </button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        variant="white"
                        className="flex-1"
                        loading={busyId === c.id}
                        onClick={() => bump(c, amount)}
                      >
                        +{amount} {c.unit === "pasos" ? "pasos" : c.unit}
                      </Button>
                    )}
                    <DeleteButton small onConfirm={() => remove(c)} label="" />
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      <NewChallengeModal
        open={modal}
        onClose={() => setModal(false)}
        onCreated={(c) => {
          setItems((prev) => (prev ? [...prev, c] : [c]));
          setModal(false);
          toast.push({ title: "Reto creado", description: c.title, tone: "ok" });
        }}
      />
      <LevelUpModal level={levelUp} onClose={() => setLevelUp(null)} />
    </div>
  );
}

function NewChallengeModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (c: ChallengeDTO) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [target, setTarget] = useState(5);
  const [unit, setUnit] = useState("veces");
  const [icon, setIcon] = useState("Star");
  const [xp, setXp] = useState(20);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ challenge: ChallengeDTO }>("/api/challenges", {
        method: "POST",
        body: JSON.stringify({ title, description, target, unit, icon, xp }),
      });
      onCreated(res.challenge);
      setTitle("");
      setDescription("");
      setTarget(5);
      setUnit("veces");
      setIcon("Star");
      setXp(20);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Crear tu propio reto">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Nombre del reto">
          <input
            className={inputCls}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej. Subir escaleras en vez del ascensor"
            required
          />
        </Field>
        <Field label="Descripción (opcional)">
          <input
            className={inputCls}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="¿Cómo lo lograrás?"
          />
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Meta">
            <input
              className={inputCls}
              type="number"
              min={1}
              max={50000}
              value={target}
              onChange={(e) => setTarget(Number(e.target.value))}
              required
            />
          </Field>
          <Field label="Unidad">
            <input
              className={inputCls}
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="veces"
              maxLength={12}
            />
          </Field>
          <Field label="XP">
            <input
              className={inputCls}
              type="number"
              min={5}
              max={200}
              value={xp}
              onChange={(e) => setXp(Number(e.target.value))}
            />
          </Field>
        </div>
        <Field label="Icono">
          <div className="grid max-h-36 grid-cols-8 gap-1.5 overflow-y-auto rounded-xl border-2 border-ink bg-white p-2">
            {ICON_CHOICES.map((name) => {
              const Icon = iconByName(name);
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => setIcon(name)}
                  className={`press flex aspect-square cursor-pointer items-center justify-center rounded-lg border-2 ${icon === name ? "border-ink bg-limey shadow-pop-xs" : "border-transparent hover:bg-paper"}`}
                  title={name}
                >
                  <Icon className="size-4.5" strokeWidth={2.2} />
                </button>
              );
            })}
          </div>
        </Field>
        {error && <p className="text-sm font-bold text-coral">{error}</p>}
        <Button type="submit" className="w-full" size="lg" loading={busy}>
          Crear reto
        </Button>
      </form>
    </Modal>
  );
}
