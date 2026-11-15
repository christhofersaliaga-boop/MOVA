export const ACTIVITY_META: Record<
  string,
  { icon: string; color: string; label: string }
> = {
  steps: { icon: "Footprints", color: "#6FD6FF", label: "Pasos" },
  walk: { icon: "Waves", color: "#8FE388", label: "Caminata" },
  stretch: { icon: "Move", color: "#FFA9D6", label: "Estiramiento" },
  routine: { icon: "Dumbbell", color: "#B9A8FF", label: "Micro-rutina" },
  challenge: { icon: "Target", color: "#FFC84D", label: "Reto" },
  metric: { icon: "Heart", color: "#FFA9D6", label: "Medición" },
  custom: { icon: "Star", color: "#FF7461", label: "Actividad" },
};

export function activityMeta(type: string) {
  return ACTIVITY_META[type] ?? ACTIVITY_META.custom;
}
