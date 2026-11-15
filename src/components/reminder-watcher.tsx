"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Armchair, DoorOpen, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useToast } from "@/components/toaster";
import { Button } from "@/components/ui";
import { nowHHMM, todayKey } from "@/lib/dates";
import type { PublicUser, ReminderDTO } from "@/lib/types";

const LAST_MOVE_KEY = "mova:lastMove";
const LAST_ALERT_KEY = "mova:lastAlert";

export function markMovement() {
  if (typeof window === "undefined") return;
  localStorage.setItem(LAST_MOVE_KEY, String(Date.now()));
  window.dispatchEvent(new Event("mova:moved"));
}

export function lastMovementAt(): number {
  if (typeof window === "undefined") return Date.now();
  const raw = localStorage.getItem(LAST_MOVE_KEY);
  return raw ? Number(raw) : Date.now();
}

function browserNotify(title: string, body: string) {
  if (typeof Notification === "undefined") return;
  if (Notification.permission === "granted") {
    try {
      new Notification(title, { body });
    } catch {
      /* algunos navegadores moviles no soportan el constructor */
    }
  }
}

const KIND_MSG: Record<string, string> = {
  break: "Momento perfecto para una pausa activa de 2 minutos.",
  water: "Hidratarte también cuenta como hábito saludable.",
  posture: "Checa tu postura: espalda recta, hombros sueltos.",
  custom: "Tu recordatorio personalizado está sonando.",
};

export function ReminderWatcher({ user }: { user: PublicUser }) {
  const toast = useToast();
  const router = useRouter();
  const [alert, setAlert] = useState<number | null>(null);
  const remindersRef = useRef<ReminderDTO[]>([]);
  const alertOpenRef = useRef(false);

  useEffect(() => {
    if (!localStorage.getItem(LAST_MOVE_KEY)) {
      localStorage.setItem(LAST_MOVE_KEY, String(Date.now()));
    }
    const onMoved = () => {
      localStorage.setItem(LAST_MOVE_KEY, String(Date.now()));
      setAlert(null);
      alertOpenRef.current = false;
    };
    window.addEventListener("mova:moved", onMoved);
    return () => window.removeEventListener("mova:moved", onMoved);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/reminders")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data?.reminders) remindersRef.current = data.reminders;
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const tick = useCallback(() => {
    const now = new Date();

    // ---- recordatorios programados ----
    if (user.notifyEnabled) {
      const hhmm = nowHHMM(now);
      const day = now.getDay();
      for (const r of remindersRef.current) {
        if (!r.enabled) continue;
        if (r.time !== hhmm || !r.days.includes(day)) continue;
        const sentKey = `mova:sent:${r.id}:${todayKey()}:${r.time}`;
        if (localStorage.getItem(sentKey)) continue;
        localStorage.setItem(sentKey, "1");
        const msg = KIND_MSG[r.kind] ?? KIND_MSG.custom;
        toast.push({ title: r.title, description: msg, tone: "info" });
        browserNotify(r.title, msg);
      }
    }

    // ---- alerta de sedentarismo ----
    const hour = now.getHours();
    if (hour < 7 || hour > 22) return;
    const idleMin = Math.floor((Date.now() - lastMovementAt()) / 60000);
    const lastAlert = Number(localStorage.getItem(LAST_ALERT_KEY) ?? 0);
    if (
      idleMin >= user.sedentaryMinutes &&
      !alertOpenRef.current &&
      Date.now() - lastAlert > 30 * 60000
    ) {
      alertOpenRef.current = true;
      localStorage.setItem(LAST_ALERT_KEY, String(Date.now()));
      setAlert(idleMin);
      if (user.notifyEnabled) {
        browserNotify(
          "Mova te extraña",
          `Llevas ${idleMin} min sin moverte. Una micro-rutina de 3 min te reinicia.`
        );
      }
    }
  }, [toast, user.notifyEnabled, user.sedentaryMinutes]);

  useEffect(() => {
    const t = setInterval(tick, 20000);
    const first = setTimeout(tick, 4000);
    return () => {
      clearInterval(t);
      clearTimeout(first);
    };
  }, [tick]);

  return (
    <AnimatePresence>
      {alert !== null && (
        <motion.div
          initial={{ y: 80, opacity: 0, scale: 0.96 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 60, opacity: 0, scale: 0.96 }}
          transition={{ type: "spring", stiffness: 320, damping: 28 }}
          className="fixed inset-x-4 bottom-24 z-[80] sm:left-auto sm:right-6 sm:w-[380px] lg:bottom-6"
        >
          <div className="rounded-2xl border-2 border-ink bg-sunny p-4 shadow-pop-lg">
            <div className="flex items-start gap-3">
              <div className="relative flex size-11 shrink-0 items-center justify-center rounded-xl border-2 border-ink bg-white">
                <Armchair className="size-5" strokeWidth={2.2} />
                <span className="animate-ping-ring absolute inset-0 rounded-xl border-2 border-ink" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-display text-[15px] font-extrabold leading-tight">
                  Alerta de sedentarismo
                </p>
                <p className="mt-0.5 text-[13px] font-medium leading-snug text-ink/80">
                  Llevas <b>{alert} min</b> quieto estudiando. Tu cuerpo pide una
                  pausa activa a gritos (educados).
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="ink"
                    onClick={() => {
                      markMovement();
                      router.push("/rutinas");
                    }}
                  >
                    <DoorOpen className="size-4" /> Pausa de 3 min
                  </Button>
                  <Button size="sm" variant="white" onClick={markMovement}>
                    Ya me moví
                  </Button>
                </div>
              </div>
              <button
                onClick={() => {
                  setAlert(null);
                  alertOpenRef.current = false;
                }}
                className="press flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-lg border-2 border-ink bg-white"
                aria-label="Cerrar aviso"
              >
                <X className="size-3.5" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
