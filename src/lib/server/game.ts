import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { challenges, unlockedAvatars, users } from "@/db/schema";
import { AVATARS } from "@/lib/avatars";
import { addDays, todayKey } from "@/lib/dates";
import { levelFromXp } from "@/lib/gamification";
import type { GamificationState } from "@/lib/types";

type ChallengeTemplate = {
  icon: string;
  title: string;
  description: string;
  target: number;
  unit: string;
  xp: number;
  tier: string;
};

const EASY: ChallengeTemplate[] = [
  { icon: "PersonStanding", title: "Ponte de pie 5 veces", description: "Levántate de la silla y estira 10 segundos cada vez. Tu espalda lo agradece.", target: 5, unit: "veces", xp: 15, tier: "facil" },
  { icon: "Footprints", title: "Suma 500 pasos extra", description: "Camina por el pasillo entre clases o mientras repasas en voz alta.", target: 500, unit: "pasos", xp: 25, tier: "facil" },
  { icon: "GlassWater", title: "3 pausas de agua", description: "Bebe un vaso de agua en 3 momentos distintos del día.", target: 3, unit: "vasos", xp: 15, tier: "facil" },
  { icon: "StretchHorizontal", title: "Estira el cuello 2 veces", description: "Rotaciones suaves de cuello, 30 segundos cada una. Ideal tras apuntes largos.", target: 2, unit: "veces", xp: 15, tier: "facil" },
  { icon: "Timer", title: "1 micro-rutina de 3 min", description: "Completa cualquier rutina de la biblioteca. Sin equipo, en tu carpeta.", target: 1, unit: "rutina", xp: 30, tier: "facil" },
];

const MID: ChallengeTemplate[] = [
  { icon: "Footprints", title: "Suma 1000 pasos extra", description: "Bájate una parada antes o da una vuelta a la manzana al salir.", target: 1000, unit: "pasos", xp: 35, tier: "medio" },
  { icon: "Timer", title: "2 micro-rutinas hoy", description: "Una por la mañana y otra por la tarde. Elije zonas distintas del cuerpo.", target: 2, unit: "rutinas", xp: 45, tier: "medio" },
  { icon: "Armchair", title: "Pausa activa entre clases ×3", description: "En 3 huecos entre clases, haz al menos 2 minutos de movimiento.", target: 3, unit: "pausas", xp: 30, tier: "medio" },
  { icon: "Move", title: "Estira la espalda 3 veces", description: "Apertura de pecho o torsión sentado, 30 segundos por repetición.", target: 3, unit: "veces", xp: 20, tier: "medio" },
  { icon: "Waves", title: "Respiración profunda ×4", description: "5 respiraciones lentas lejos de la pantalla, 4 veces en el día.", target: 4, unit: "pausas", xp: 20, tier: "medio" },
];

const PRO: ChallengeTemplate[] = [
  { icon: "Footprints", title: "Suma 2000 pasos extra", description: "Convierte el trayecto en tu momento de movimiento del día.", target: 2000, unit: "pasos", xp: 50, tier: "pro" },
  { icon: "Timer", title: "3 micro-rutinas hoy", description: "Reto triple: mañana, tarde y noche. Tu cuerpo manda.", target: 3, unit: "rutinas", xp: 60, tier: "pro" },
  { icon: "Dumbbell", title: "10 min de movimiento", description: "Acumula 10 minutos activos entre caminatas, estiramientos o rutinas.", target: 10, unit: "min", xp: 45, tier: "pro" },
  { icon: "AlarmClock", title: "Pausa cada 45 min de estudio", description: "4 micro-pausas programadas en tu sesión de estudio larga.", target: 4, unit: "pausas", xp: 50, tier: "pro" },
];

function hashKey(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function pick(pool: ChallengeTemplate[], seed: number, skip: number[]) {
  let idx = seed % pool.length;
  while (skip.includes(idx)) idx = (idx + 1) % pool.length;
  return { tpl: pool[idx], idx };
}

export async function ensureDailyChallenges(
  userId: number,
  xp: number
): Promise<void> {
  const date = todayKey();
  const existing = await db
    .select({ id: challenges.id })
    .from(challenges)
    .where(and(eq(challenges.userId, userId), eq(challenges.date, date)))
    .limit(1);
  if (existing.length > 0) return;

  const { level } = levelFromXp(xp);
  const h = hashKey(`${date}:${userId}`);

  const chosen: ChallengeTemplate[] = [];
  const skipE: number[] = [];
  const e1 = pick(EASY, h, skipE);
  skipE.push(e1.idx);
  chosen.push(e1.tpl);

  if (level >= 5) {
    // progresivo: 1 facil + 1 medio + 1 pro
    const skipM: number[] = [];
    const m1 = pick(MID, h >> 3, skipM);
    chosen.push(m1.tpl);
    const skipP: number[] = [];
    const p1 = pick(PRO, h >> 5, skipP);
    chosen.push(p1.tpl);
  } else if (level >= 3) {
    // 1 facil + 1 facil + 1 medio
    const e2 = pick(EASY, h >> 3, skipE);
    chosen.push(e2.tpl);
    const m1 = pick(MID, h >> 5, []);
    chosen.push(m1.tpl);
  } else {
    // nivel inicial: todo muy accesible
    const e2 = pick(EASY, h >> 3, skipE);
    skipE.push(e2.idx);
    chosen.push(e2.tpl);
    const e3 = pick(EASY, h >> 5, skipE);
    chosen.push(e3.tpl);
  }

  await db.insert(challenges).values(
    chosen.map((tpl) => ({
      userId,
      title: tpl.title,
      description: tpl.description,
      icon: tpl.icon,
      target: tpl.target,
      progress: 0,
      unit: tpl.unit,
      xp: tpl.xp,
      tier: tpl.tier,
      date,
      completed: false,
      generated: true,
    }))
  );
}

export async function addXpAndTouch(
  userId: number,
  amount: number,
  date = todayKey()
): Promise<GamificationState> {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) throw new Error("Usuario no encontrado");

  let streak = user.streak || 1;
  if (user.lastActiveDate === date) {
    // mismo dia: la racha no cambia
  } else if (user.lastActiveDate === addDays(date, -1)) {
    streak += 1;
  } else {
    streak = 1;
  }

  const xp = Math.max(0, user.xp + amount);
  await db
    .update(users)
    .set({ xp, streak, lastActiveDate: date })
    .where(eq(users.id, userId));

  const { level, into, needed } = levelFromXp(xp);
  await unlockEligibleAvatars(userId, level);
  return { xp, level, into, needed, streak };
}

export async function unlockEligibleAvatars(
  userId: number,
  level: number
): Promise<string[]> {
  const rows = await db
    .select({ avatarId: unlockedAvatars.avatarId })
    .from(unlockedAvatars)
    .where(eq(unlockedAvatars.userId, userId));
  const have = new Set(rows.map((r) => r.avatarId));
  const newly: string[] = [];
  for (const a of AVATARS) {
    if (a.level > 0 && a.level <= level && !have.has(a.id)) {
      await db.insert(unlockedAvatars).values({ userId, avatarId: a.id });
      have.add(a.id);
      newly.push(a.id);
    }
  }
  return newly;
}
