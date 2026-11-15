"use client";

import { AnimatePresence, motion } from "framer-motion";
import { BellRing, CheckCircle2, Flame, TriangleAlert } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type ToastTone = "ok" | "info" | "warn" | "err";

export type Toast = {
  title: string;
  description?: string;
  tone?: ToastTone;
};

type ToastItem = Toast & { id: number; tone: ToastTone };

const ToastCtx = createContext<{ push: (t: Toast) => void }>({ push: () => {} });

export function useToast() {
  return useContext(ToastCtx);
}

const TONE_STYLE: Record<ToastTone, { dot: string; Icon: typeof BellRing }> = {
  ok: { dot: "#C9F24F", Icon: CheckCircle2 },
  info: { dot: "#6FD6FF", Icon: BellRing },
  warn: { dot: "#FFC84D", Icon: TriangleAlert },
  err: { dot: "#FF7461", Icon: Flame },
};

let toastId = 0;

export function ToasterProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const push = useCallback((t: Toast) => {
    const id = ++toastId;
    setItems((prev) => [...prev.slice(-3), { ...t, id, tone: t.tone ?? "info" }]);
    setTimeout(() => {
      setItems((prev) => prev.filter((x) => x.id !== id));
    }, 4200);
  }, []);

  const value = useMemo(() => ({ push }), [push]);

  return (
    <ToastCtx.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-3 z-[200] flex flex-col items-center gap-2 px-4">
        <AnimatePresence>
          {items.map((t) => {
            const { dot, Icon } = TONE_STYLE[t.tone];
            return (
              <motion.div
                key={t.id}
                initial={{ y: -24, opacity: 0, scale: 0.95 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: -16, opacity: 0, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 500, damping: 32 }}
                className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border-2 border-ink bg-white p-3.5 shadow-pop"
              >
                <div
                  className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border-2 border-ink"
                  style={{ background: dot }}
                >
                  <Icon className="size-4" strokeWidth={2.4} />
                </div>
                <div className="min-w-0">
                  <p className="font-display text-sm font-extrabold leading-tight">{t.title}</p>
                  {t.description && (
                    <p className="mt-0.5 text-[13px] font-medium leading-snug text-ink-soft">
                      {t.description}
                    </p>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  );
}
