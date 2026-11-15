"use client";

import { BellRing, Check, LogOut, Save, ShieldCheck, Volume2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useToast } from "@/components/toaster";
import { AvatarBubble, Button, Card, Chip, Field, Toggle, inputCls, cx } from "@/components/ui";
import { avatarById } from "@/lib/avatars";
import { api } from "@/lib/client/api";
import { levelFromXp } from "@/lib/gamification";
import { setVoicePref } from "@/lib/speech";
import type { PublicUser } from "@/lib/types";

export function PerfilView({ user }: { user: PublicUser }) {
  const toast = useToast();
  const router = useRouter();
  const [name, setName] = useState(user.name);
  const [sedentary, setSedentary] = useState(user.sedentaryMinutes);
  const [notify, setNotify] = useState(user.notifyEnabled);
  const [voice, setVoice] = useState(user.voiceEnabled);
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [perm, setPerm] = useState<NotificationPermission | "na">("na");
  const { level } = levelFromXp(user.xp);

  useEffect(() => {
    setPerm(typeof Notification === "undefined" ? "na" : Notification.permission);
  }, []);

  async function saveName() {
    setSaving(true);
    try {
      await api("/api/me", { method: "PATCH", body: JSON.stringify({ name }) });
      toast.push({ title: "Perfil actualizado", tone: "ok" });
      router.refresh();
    } catch (e) {
      toast.push({ title: "No se guardó", description: e instanceof Error ? e.message : undefined, tone: "err" });
    } finally {
      setSaving(false);
    }
  }

  async function savePref(patch: { sedentaryMinutes?: number; notifyEnabled?: boolean; voiceEnabled?: boolean }) {
    try {
      await api("/api/me", { method: "PATCH", body: JSON.stringify(patch) });
      router.refresh();
    } catch (e) {
      toast.push({ title: "No se guardó", description: e instanceof Error ? e.message : undefined, tone: "err" });
    }
  }

  async function logout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  const avatarName = avatarById(user.avatar).name;

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[13px] font-bold uppercase tracking-widest text-ink-soft">Tu espacio</p>
        <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">Perfil</h1>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* identidad */}
        <Card className="p-5">
          <div className="flex items-center gap-4">
            <AvatarBubble id={user.avatar} size={72} />
            <div className="min-w-0">
              <p className="truncate font-display text-xl font-extrabold">{user.name}</p>
              <p className="truncate text-sm font-semibold text-ink-soft">{user.email}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Chip color="#C9F24F">Nivel {level}</Chip>
                <Chip color="#FFA9D6">{user.streak} días de racha</Chip>
                <Chip color="#FFFFFF">{avatarName}</Chip>
              </div>
            </div>
          </div>
          <Link href="/recompensas" className="mt-4 block">
            <Button variant="white" size="sm" className="w-full">
              Cambiar avatar
            </Button>
          </Link>

          <div className="mt-5 border-t-2 border-ink/10 pt-4">
            <Field label="Tu nombre">
              <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} maxLength={40} />
            </Field>
            <Button className="mt-3" size="sm" loading={saving} disabled={name.trim() === user.name} onClick={saveName}>
              <Save className="size-4" /> Guardar nombre
            </Button>
          </div>
        </Card>

        {/* preferencias */}
        <Card className="p-5">
          <h2 className="font-display text-lg font-extrabold tracking-tight">Alertas inteligentes</h2>
          <p className="mt-1 text-sm font-medium text-ink-soft">
            Te avisamos cuando lleves demasiado tiempo estudiando sin moverte.
          </p>

          <div className="mt-4">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink-soft">
              Avísame tras estar sentado…
            </span>
            <div className="flex flex-wrap gap-2">
              {[20, 30, 40, 60, 90].map((m) => (
                <button
                  key={m}
                  onClick={() => {
                    setSedentary(m);
                    savePref({ sedentaryMinutes: m });
                  }}
                  className={cx(
                    "press cursor-pointer rounded-xl border-2 border-ink px-3.5 py-2 font-display text-sm font-extrabold",
                    sedentary === m ? "bg-limey shadow-pop-xs" : "bg-white"
                  )}
                >
                  {m} min
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between gap-3 rounded-xl border-2 border-ink bg-paper p-3.5">
            <div className="flex items-center gap-2.5">
              <BellRing className="size-5 text-viola" strokeWidth={2.4} />
              <div>
                <p className="text-sm font-bold">Recordatorios y avisos</p>
                <p className="text-xs font-semibold text-ink-soft">Pausas, agua, postura y sedentarismo</p>
              </div>
            </div>
            <Toggle
              checked={notify}
              onChange={(v) => {
                setNotify(v);
                savePref({ notifyEnabled: v });
              }}
            />
          </div>

          <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border-2 border-ink bg-paper p-3.5">
            <div className="flex items-center gap-2.5">
              <Volume2 className="size-5 text-viola" strokeWidth={2.4} />
              <div>
                <p className="text-sm font-bold">Voz en las rutinas</p>
                <p className="text-xs font-semibold text-ink-soft">
                  Te dicta cada ejercicio y sus instrucciones en español
                </p>
              </div>
            </div>
            <Toggle
              checked={voice}
              onChange={(v) => {
                setVoice(v);
                setVoicePref(v);
                savePref({ voiceEnabled: v });
              }}
            />
          </div>

          {perm === "default" && (
            <Button
              variant="violet"
              size="sm"
              className="mt-3 w-full"
              onClick={() => Notification.requestPermission().then(setPerm)}
            >
              Permitir notificaciones del navegador
            </Button>
          )}
          {perm === "granted" && (
            <p className="mt-3 flex items-center gap-1.5 text-xs font-bold text-ink-soft">
              <Check className="size-4 text-minty" strokeWidth={3} /> Notificaciones del navegador activadas
            </p>
          )}
        </Card>
      </div>

      {user.isAdmin && (
        <Link href="/admin" className="block">
          <Card flat className="press flex items-center justify-between gap-3 bg-ink p-5 text-paper">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-xl border-2 border-paper/40 bg-viola text-white">
                <ShieldCheck className="size-6" strokeWidth={2.2} />
              </div>
              <div>
                <p className="font-display text-lg font-extrabold">Panel de administración</p>
                <p className="text-sm font-medium text-paper/70">
                  Controla registros y revisa el historial de cada usuario.
                </p>
              </div>
            </div>
            <span className="font-display text-sm font-bold text-limey">Abrir →</span>
          </Card>
        </Link>
      )}

      <Card className="flex flex-wrap items-center justify-between gap-3 p-5" flat>
        <div>
          <p className="font-display text-lg font-extrabold">Cerrar sesión</p>
          <p className="text-sm font-medium text-ink-soft">Tus datos quedan guardados para cuando vuelvas.</p>
        </div>
        <Button variant="coral" onClick={logout} loading={loggingOut}>
          <LogOut className="size-4" /> Salir
        </Button>
      </Card>
    </div>
  );
}
