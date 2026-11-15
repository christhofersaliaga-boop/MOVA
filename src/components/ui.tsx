"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Loader2, X } from "lucide-react";
import { useEffect, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { avatarById } from "@/lib/avatars";
import { iconByName } from "@/lib/icons";

export function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

/* ---------------------------------- Button --------------------------------- */

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "violet" | "ink" | "coral" | "ghost" | "white";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
};

const BTN_VARIANTS: Record<string, string> = {
  primary: "bg-limey text-ink shadow-pop-sm",
  violet: "bg-viola text-white shadow-pop-sm",
  ink: "bg-ink text-paper shadow-pop-sm",
  coral: "bg-coral text-white shadow-pop-sm",
  ghost: "bg-paper text-ink shadow-pop-sm",
  white: "bg-white text-ink shadow-pop-sm",
};

const BTN_SIZES: Record<string, string> = {
  sm: "h-9 px-3.5 text-[13px] gap-1.5",
  md: "h-11 px-4.5 text-sm gap-2",
  lg: "h-14 px-7 text-base gap-2",
};

export function Button({
  variant = "primary",
  size = "md",
  loading,
  className,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={cx(
        "press inline-flex cursor-pointer select-none items-center justify-center rounded-xl border-2 border-ink font-display font-bold tracking-tight disabled:pointer-events-none disabled:opacity-50",
        BTN_VARIANTS[variant],
        BTN_SIZES[size],
        className
      )}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && <Loader2 className="size-4 animate-spin" />}
      {children}
    </button>
  );
}

/* ------------------------------ Two-step delete ----------------------------- */

export function DeleteButton({
  onConfirm,
  label = "Eliminar",
  className,
  small,
}: {
  onConfirm: () => void;
  label?: string;
  className?: string;
  small?: boolean;
}) {
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 2600);
    return () => clearTimeout(t);
  }, [armed]);

  return (
    <button
      type="button"
      onClick={() => (armed ? onConfirm() : setArmed(true))}
      className={cx(
        "press inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border-2 border-ink font-display font-bold transition-colors",
        small ? "h-8 px-2.5 text-xs" : "h-9 px-3 text-[13px]",
        armed ? "bg-coral text-white" : "bg-white text-ink hover:bg-rosy/40",
        className
      )}
    >
      <X className={small ? "size-3.5" : "size-4"} />
      {armed ? "¿Seguro? Toca de nuevo" : label}
    </button>
  );
}

/* ----------------------------------- Card ----------------------------------- */

export function Card({
  className,
  children,
  flat,
}: {
  className?: string;
  children: ReactNode;
  flat?: boolean;
}) {
  return (
    <div
      className={cx(
        "rounded-2xl border-2 border-ink bg-white",
        flat ? "shadow-pop-xs" : "shadow-pop",
        className
      )}
    >
      {children}
    </div>
  );
}

/* ----------------------------------- Chip ----------------------------------- */

export function Chip({
  className,
  children,
  color = "#C9F24F",
}: {
  className?: string;
  children: ReactNode;
  color?: string;
}) {
  return (
    <span
      style={{ background: color }}
      className={cx(
        "inline-flex items-center gap-1 rounded-full border-2 border-ink px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide",
        className
      )}
    >
      {children}
    </span>
  );
}

/* ----------------------------------- Modal ---------------------------------- */

export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[90] flex items-end justify-center bg-ink/45 backdrop-blur-[2px] sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            initial={{ y: 60, opacity: 0, scale: 0.97 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            className={cx(
              "max-h-[92vh] w-full overflow-y-auto rounded-t-3xl border-2 border-b-0 border-ink bg-paper shadow-pop-lg sm:rounded-3xl sm:border-b-2",
              wide ? "sm:max-w-2xl" : "sm:max-w-lg"
            )}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b-2 border-ink bg-paper px-5 py-4 sm:rounded-t-3xl">
              <h3 className="font-display text-lg font-extrabold tracking-tight">{title}</h3>
              <button
                onClick={onClose}
                className="press flex size-8 cursor-pointer items-center justify-center rounded-lg border-2 border-ink bg-white shadow-pop-xs"
                aria-label="Cerrar"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="p-5">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ---------------------------------- Inputs ---------------------------------- */

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink-soft">
        {label}
      </span>
      {children}
    </label>
  );
}

export const inputCls =
  "h-11 w-full rounded-xl border-2 border-ink bg-white px-3 text-sm font-medium outline-none transition-shadow placeholder:text-ink-soft/50 focus:shadow-pop-sm";

/* --------------------------------- Spinner ---------------------------------- */

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cx("size-5 animate-spin", className)} />;
}

export function PageLoader({ text = "Cargando…" }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24">
      <div className="relative">
        <div className="size-14 rounded-2xl border-2 border-ink bg-limey shadow-pop-sm" />
        <div className="animate-ping-ring absolute inset-0 rounded-2xl border-2 border-ink" />
      </div>
      <p className="font-display text-sm font-bold text-ink-soft">{text}</p>
    </div>
  );
}

/* --------------------------------- Skeleton --------------------------------- */

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx("animate-pulse rounded-xl bg-ink/10", className)} />;
}

/* -------------------------------- ProgressBar ------------------------------- */

export function ProgressBar({
  value,
  max,
  color = "#C9F24F",
  className,
  height = 12,
}: {
  value: number;
  max: number;
  color?: string;
  className?: string;
  height?: number;
}) {
  const pct = Math.min(100, Math.max(0, (value / Math.max(1, max)) * 100));
  return (
    <div
      className={cx("w-full overflow-hidden rounded-full border-2 border-ink bg-white", className)}
      style={{ height }}
    >
      <motion.div
        className="h-full rounded-full border-r-2 border-ink"
        style={{ background: color }}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ type: "spring", stiffness: 90, damping: 20 }}
      />
    </div>
  );
}

/* -------------------------------- ProgressRing ------------------------------ */

export function ProgressRing({
  size = 76,
  stroke = 8,
  value,
  max,
  color = "#C9F24F",
  children,
}: {
  size?: number;
  stroke?: number;
  value: number;
  max: number;
  color?: string;
  children?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.min(1, Math.max(0, value / Math.max(1, max)));
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(23,20,31,0.12)" strokeWidth={stroke} fill="none" />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - pct) }}
          transition={{ type: "spring", stiffness: 60, damping: 16 }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
}

/* --------------------------------- EmptyState -------------------------------- */

export function EmptyState({
  icon,
  title,
  hint,
  action,
  color = "#C9F24F",
}: {
  icon: string;
  title: string;
  hint: string;
  action?: ReactNode;
  color?: string;
}) {
  const Icon = iconByName(icon);
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-ink/40 bg-white/60 px-6 py-12 text-center">
      <div
        className="mb-4 flex size-16 items-center justify-center rounded-2xl border-2 border-ink shadow-pop-sm"
        style={{ background: color }}
      >
        <Icon className="size-8" strokeWidth={1.8} />
      </div>
      <h3 className="font-display text-lg font-extrabold tracking-tight">{title}</h3>
      <p className="mt-1 max-w-xs text-sm font-medium text-ink-soft">{hint}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/* -------------------------------- AvatarBubble ------------------------------- */

export function AvatarBubble({
  id,
  size = 44,
  className,
  shadow = true,
}: {
  id: string;
  size?: number;
  className?: string;
  shadow?: boolean;
}) {
  const def = avatarById(id);
  const Icon = iconByName(def.icon);
  return (
    <div
      className={cx(
        "flex shrink-0 items-center justify-center rounded-2xl border-2 border-ink",
        shadow && "shadow-pop-sm",
        className
      )}
      style={{ background: def.bg, color: def.fg, width: size, height: size }}
    >
      <Icon style={{ width: size * 0.52, height: size * 0.52 }} strokeWidth={2.2} />
    </div>
  );
}

/* ----------------------------------- Toggle ---------------------------------- */

export function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cx(
        "press relative h-7 w-12 cursor-pointer rounded-full border-2 border-ink transition-colors disabled:opacity-50",
        checked ? "bg-limey" : "bg-white"
      )}
    >
      <motion.span
        layout
        transition={{ type: "spring", stiffness: 500, damping: 32 }}
        className={cx(
          "absolute top-1/2 size-4.5 -translate-y-1/2 rounded-full border-2 border-ink bg-ink",
          checked ? "right-1 bg-white" : "left-1"
        )}
      />
    </button>
  );
}

/* --------------------------------- Segmented --------------------------------- */

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div className={cx("inline-flex gap-1 rounded-xl border-2 border-ink bg-white p-1 shadow-pop-xs", className)}>
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cx(
            "press cursor-pointer rounded-lg px-3.5 py-1.5 font-display text-[13px] font-bold transition-colors",
            value === o.value ? "bg-ink text-paper" : "text-ink hover:bg-paper"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
