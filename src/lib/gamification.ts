// Shared XP / level math (safe for client and server)

export function xpForNext(level: number): number {
  return 100 + (level - 1) * 60;
}

export function levelFromXp(xp: number): {
  level: number;
  into: number;
  needed: number;
} {
  let level = 1;
  let rest = xp;
  while (rest >= xpForNext(level)) {
    rest -= xpForNext(level);
    level++;
  }
  return { level, into: rest, needed: xpForNext(level) };
}

export const XP = {
  routineMinute: 8,
  walkMinute: 3,
  stretchMinute: 4,
  perHundredSteps: 4,
  challengeBase: 20,
};
