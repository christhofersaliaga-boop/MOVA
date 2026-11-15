// Catalog of unlockable avatars (shared client/server)

export type AvatarDef = {
  id: string;
  name: string;
  tagline: string;
  icon: string;
  level: number; // level required to unlock (0 = starter)
  bg: string;
  fg: string;
};

export const AVATARS: AvatarDef[] = [
  { id: "spark", name: "Chispa", tagline: "Tu energía inicial", icon: "Zap", level: 0, bg: "#C9F24F", fg: "#17141F" },
  { id: "breeze", name: "Brisa", tagline: "Suave pero constante", icon: "Wind", level: 0, bg: "#6FD6FF", fg: "#17141F" },
  { id: "sunny", name: "Solecito", tagline: "Buena vibra siempre", icon: "Sun", level: 0, bg: "#FFC84D", fg: "#17141F" },
  { id: "sprout", name: "Brote", tagline: "El hábito crece", icon: "Sprout", level: 2, bg: "#8FE388", fg: "#17141F" },
  { id: "ritmo", name: "Ritmo", tagline: "Muévete con flow", icon: "Music", level: 3, bg: "#FFA9D6", fg: "#17141F" },
  { id: "destello", name: "Destello", tagline: "Brillas entre clases", icon: "Sparkles", level: 4, bg: "#B9A8FF", fg: "#17141F" },
  { id: "cohete", name: "Cohete", tagline: "Imparable", icon: "Rocket", level: 5, bg: "#FF7461", fg: "#FFFFFF" },
  { id: "llama", name: "Llama", tagline: "Racha encendida", icon: "Flame", level: 6, bg: "#FF9E4D", fg: "#17141F" },
  { id: "sigilo", name: "Sigilo", tagline: "Ninja de las pausas", icon: "Ghost", level: 7, bg: "#D8D2F5", fg: "#17141F" },
  { id: "robo", name: "Robo", tagline: "Constancia automática", icon: "Bot", level: 8, bg: "#9BE8D8", fg: "#17141F" },
  { id: "corona", name: "Corona", tagline: "Realeza del movimiento", icon: "Crown", level: 9, bg: "#FFD94D", fg: "#17141F" },
  { id: "campeon", name: "Campeón", tagline: "Leyenda del campus", icon: "Trophy", level: 10, bg: "#17141F", fg: "#C9F24F" },
];

export function avatarById(id: string): AvatarDef {
  return AVATARS.find((a) => a.id === id) ?? AVATARS[0];
}

export const STARTER_AVATARS = AVATARS.filter((a) => a.level === 0).map(
  (a) => a.id
);
