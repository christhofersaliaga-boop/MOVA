import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  activities,
  bodyMetrics,
  challenges,
  reminders,
  scheduleBlocks,
  unlockedAvatars,
  users,
} from "@/db/schema";
import { STARTER_AVATARS } from "@/lib/avatars";
import { addDays, todayKey } from "@/lib/dates";
import { levelFromXp } from "@/lib/gamification";
import { ROUTINES } from "@/lib/routines";
import { hashPassword } from "@/lib/server/auth";
import { ensureDailyChallenges, addXpAndTouch } from "@/lib/server/game";

export const DEMO_EMAIL = "demo@mova.app";
export const DEMO_PASSWORD = "movademo";

const DEFAULT_REMINDERS = [
  { title: "Estiramiento matutino", time: "08:15", days: [1, 2, 3, 4, 5], kind: "break" },
  { title: "Pausa activa entre clases", time: "10:30", days: [1, 2, 3, 4, 5], kind: "break" },
  { title: "Hora del agua", time: "13:00", days: [0, 1, 2, 3, 4, 5, 6], kind: "water" },
  { title: "Revisa tu postura", time: "16:00", days: [1, 2, 3, 4, 5], kind: "posture" },
];

const DEFAULT_SCHEDULE = [
  { title: "Cálculo I", day: 1, startTime: "08:00", endTime: "09:30", location: "Aula 204", color: "#7C6CFF" },
  { title: "Cálculo I", day: 3, startTime: "08:00", endTime: "09:30", location: "Aula 204", color: "#7C6CFF" },
  { title: "Física II", day: 1, startTime: "10:00", endTime: "11:30", location: "Lab. F-2", color: "#6FD6FF" },
  { title: "Programación", day: 2, startTime: "10:00", endTime: "12:00", location: "Sala Cómputo 3", color: "#C9F24F" },
  { title: "Programación", day: 4, startTime: "10:00", endTime: "12:00", location: "Sala Cómputo 3", color: "#C9F24F" },
  { title: "Inglés Técnico", day: 3, startTime: "12:00", endTime: "13:00", location: "Aula 110", color: "#FFC84D" },
  { title: "Inglés Técnico", day: 5, startTime: "12:00", endTime: "13:00", location: "Aula 110", color: "#FFC84D" },
  { title: "Laboratorio de Física", day: 5, startTime: "15:00", endTime: "17:00", location: "Lab. F-1", color: "#FF7461" },
];

export async function seedStarterContent(userId: number): Promise<void> {
  await db.insert(unlockedAvatars).values(
    STARTER_AVATARS.map((avatarId) => ({ userId, avatarId }))
  );
  await db.insert(reminders).values(
    DEFAULT_REMINDERS.map((r) => ({ ...r, userId }))
  );
  await db.insert(scheduleBlocks).values(
    DEFAULT_SCHEDULE.map((b) => ({ ...b, userId }))
  );
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export async function ensureDemoAccount(): Promise<void> {
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, DEMO_EMAIL))
    .limit(1);
  if (existing.length > 0) return;

  const [user] = await db
    .insert(users)
    .values({
      email: DEMO_EMAIL,
      name: "Alex Rivera",
      passwordHash: hashPassword(DEMO_PASSWORD),
      avatar: "cohete",
      isAdmin: true,
    })
    .returning();

  await seedStarterContent(user.id);

  // 14 dias de historial realista
  const rand = mulberry32(user.id * 7919 + 17);
  const titles = ["Caminata al campus", "Pausa activa entre clases", "Estiramiento de escritorio"];
  let totalXp = 0;

  for (let back = 13; back >= 0; back--) {
    const date = addDays(todayKey(), -back);
    const base = 1800 + Math.floor(rand() * 5200);
    const steps = Math.round(base / 50) * 50;
    const stepXp = Math.round(steps / 100) * 4;
    totalXp += stepXp;
    await db.insert(activities).values({
      userId: user.id,
      type: "steps",
      title: "Pasos del día",
      minutes: Math.round(steps / 150),
      steps,
      xp: stepXp,
      date,
    });

    const routineCount = rand() < 0.25 ? 0 : rand() < 0.7 ? 1 : 2;
    for (let i = 0; i < routineCount; i++) {
      const r = ROUTINES[Math.floor(rand() * ROUTINES.length)];
      totalXp += r.xp;
      await db.insert(activities).values({
        userId: user.id,
        type: "routine",
        title: `Micro-rutina: ${r.name}`,
        minutes: r.minutes,
        steps: 0,
        xp: r.xp,
        date,
      });
    }

    if (rand() < 0.4) {
      const mins = 8 + Math.floor(rand() * 14);
      const xp = mins * 3;
      totalXp += xp;
      await db.insert(activities).values({
        userId: user.id,
        type: "walk",
        title: titles[Math.floor(rand() * titles.length)],
        minutes: mins,
        steps: mins * 90,
        xp,
        date,
      });
    }
  }

  // Retos de hoy con progreso parcial
  const { level } = levelFromXp(totalXp);
  await ensureDailyChallenges(user.id, totalXp);
  const today = await db
    .select()
    .from(challenges)
    .where(eq(challenges.userId, user.id));

  let idx = 0;
  for (const c of today) {
    if (idx === 0) {
      // primer reto completado
      await db
        .update(challenges)
        .set({ progress: c.target, completed: true })
        .where(eq(challenges.id, c.id));
      totalXp += c.xp;
    } else if (idx === 1) {
      await db
        .update(challenges)
        .set({ progress: Math.max(1, Math.floor(c.target * 0.6)) })
        .where(eq(challenges.id, c.id));
    }
    idx++;
  }

  await db
    .update(users)
    .set({ xp: totalXp, streak: 6, lastActiveDate: todayKey() })
    .where(eq(users.id, user.id));

  // Mediciones corporales de ejemplo (mejora progresiva)
  const demoHeight = 172;
  const demoWeights = [82.4, 81.5, 80.7, 79.9];
  for (let i = 0; i < demoWeights.length; i++) {
    const w = demoWeights[i];
    const m2 = (demoHeight / 100) ** 2;
    await db.insert(bodyMetrics).values({
      userId: user.id,
      weightKg: w,
      heightCm: demoHeight,
      bmi: Math.round((w / m2) * 10) / 10,
      date: addDays(todayKey(), -(demoWeights.length - 1 - i) * 7),
    });
  }

  // Desbloquear avatares segun nivel alcanzado
  const finalLevel = levelFromXp(totalXp).level;
  await addXpAndTouch(user.id, 0); // mantiene racha y desbloquea elegibles
  void finalLevel;
}
