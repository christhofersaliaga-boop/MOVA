"use client";

import { Zap } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button, Field, inputCls } from "@/components/ui";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isLogin = mode === "login";

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/auth/${isLogin ? "login" : "register"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isLogin ? { email, password } : { name, email, password }
        ),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Algo salió mal.");
        setBusy(false);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Sin conexión. Revisa tu red e intenta otra vez.");
      setBusy(false);
    }
  }

  async function fillDemo() {
    setEmail("demo@mova.app");
    setPassword("movademo");
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
      setError("No pudimos abrir la demo.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {!isLogin && (
        <Field label="Tu nombre">
          <input
            className={inputCls}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Alex Rivera"
            autoComplete="name"
            required
          />
        </Field>
      )}
      <Field label="Correo">
        <input
          className={inputCls}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tu@correo.com"
          autoComplete="email"
          required
        />
      </Field>
      <Field label="Contraseña">
        <input
          className={inputCls}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={isLogin ? "••••••••" : "Mínimo 6 caracteres"}
          autoComplete={isLogin ? "current-password" : "new-password"}
          required
        />
      </Field>

      {error && (
        <div className="rounded-xl border-2 border-ink bg-coral/15 px-3.5 py-2.5 text-sm font-bold text-ink">
          {error}
        </div>
      )}

      <Button type="submit" className="w-full" size="lg" loading={busy}>
        {isLogin ? "Entrar a Mova" : "Crear mi cuenta"}
      </Button>

      {isLogin && (
        <>
          <div className="flex items-center gap-3">
            <span className="h-0.5 flex-1 rounded bg-ink/15" />
            <span className="text-xs font-bold uppercase tracking-widest text-ink-soft">o más rápido</span>
            <span className="h-0.5 flex-1 rounded bg-ink/15" />
          </div>
          <button
            type="button"
            onClick={fillDemo}
            className="press flex w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-ink bg-limey px-4 py-3.5 font-display text-base font-extrabold shadow-pop-sm transition-colors"
          >
            <span className="flex items-center gap-2">
              <Zap className="size-5" strokeWidth={2.6} />
              Entrar con la cuenta demo · 1 toque
            </span>
            <span className="text-xs font-semibold opacity-70">demo@mova.app · movademo</span>
          </button>
        </>
      )}

      <p className="pt-1 text-center text-sm font-medium text-ink-soft">
        {isLogin ? "¿Aún sin cuenta?" : "¿Ya tienes cuenta?"}{" "}
        <Link
          href={isLogin ? "/registro" : "/login"}
          className="font-bold text-viola underline decoration-2 underline-offset-2"
        >
          {isLogin ? "Crea la tuya" : "Inicia sesión"}
        </Link>
      </p>
    </form>
  );
}
