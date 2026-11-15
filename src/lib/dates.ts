export const DAY_SHORT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
export const DAY_FULL = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];
export const MONTH_SHORT = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
];

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

export function dateKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayKey(): string {
  return dateKey(new Date());
}

export function parseKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(key: string, n: number): string {
  const d = parseKey(key);
  d.setDate(d.getDate() + n);
  return dateKey(d);
}

export function lastNDays(n: number): string[] {
  const out: string[] = [];
  const today = todayKey();
  for (let i = n - 1; i >= 0; i--) out.push(addDays(today, -i));
  return out;
}

export function labelFor(key: string): string {
  return DAY_SHORT[parseKey(key).getDay()];
}

export function friendlyDay(key: string): string {
  if (key === todayKey()) return "Hoy";
  if (key === addDays(todayKey(), -1)) return "Ayer";
  const d = parseKey(key);
  return `${d.getDate()} ${MONTH_SHORT[d.getMonth()]}`;
}

export function friendlyLongDate(d = new Date()): string {
  return `${DAY_FULL[d.getDay()]} ${d.getDate()} de ${MONTH_SHORT[d.getMonth()]}`;
}

export function nowHHMM(d = new Date()): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function greeting(d = new Date()): string {
  const h = d.getHours();
  if (h >= 6 && h < 13) return "Buenos días";
  if (h >= 13 && h < 20) return "Buenas tardes";
  return "Buenas noches";
}

export function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function minutesToTime(mins: number): string {
  return `${pad(Math.floor(mins / 60))}:${pad(mins % 60)}`;
}
