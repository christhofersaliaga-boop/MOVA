// Catalog of 2-5 minute equipment-free micro-routines (shared client/server)

export type Exercise = {
  name: string;
  seconds: number;
  cue: string;
};

export type Routine = {
  id: string;
  name: string;
  focus: string;
  minutes: number;
  color: string;
  icon: string;
  xp: number;
  exercises: Exercise[];
};

export const ROUTINES: Routine[] = [
  {
    id: "cuello",
    name: "Despierta tu cuello",
    focus: "Cuello y hombros",
    minutes: 3,
    color: "#B9A8FF",
    icon: "PersonStanding",
    xp: 30,
    exercises: [
      { name: "Inclinación lateral", seconds: 35, cue: "Lleva la oreja hacia el hombro, primero a la derecha y luego a la izquierda. Sin forzar." },
      { name: "Rotación lenta de cuello", seconds: 35, cue: "Media luna con la barbilla, de hombro a hombro, lento y controlado." },
      { name: "Círculos de hombros", seconds: 35, cue: "Hombros hacia arriba, atrás y abajo. 5 círculos hacia atrás y 5 hacia adelante." },
      { name: "Aguila cruzada", seconds: 35, cue: "Cruza los brazos frente a ti y estira la parte alta de la espalda." },
      { name: "Mentón al pecho", seconds: 30, cue: "Baja la barbilla al pecho y respira profundo 3 veces." },
    ],
  },
  {
    id: "espalda",
    name: "Espalda feliz",
    focus: "Espalda y postura",
    minutes: 3,
    color: "#6FD6FF",
    icon: "Move",
    xp: 30,
    exercises: [
      { name: "Gato-camello de pie", seconds: 35, cue: "Manos en las rodillas, arquea y redondea la espalda al ritmo de tu respiración." },
      { name: "Apertura de pecho", seconds: 35, cue: "Entrelaza los dedos detrás de la espalda y abre el pecho mirando al techo." },
      { name: "Torsión sentado", seconds: 35, cue: "Sentado, gira el torso a cada lado usando el respaldo como apoyo suave." },
      { name: "Abrazo fuerte", seconds: 30, cue: "Abraza tus hombros alternando el brazo que queda arriba." },
      { name: "Estiramiento lateral", seconds: 35, cue: "Brazo arriba y estira todo el costado, 15 segundos por lado." },
    ],
  },
  {
    id: "munecas",
    name: "Muñecas de acero",
    focus: "Muñecas y manos",
    minutes: 2,
    color: "#FFC84D",
    icon: "Sparkles",
    xp: 20,
    exercises: [
      { name: "Círculos de muñeca", seconds: 30, cue: "Puños suaves, dibuja círculos amplios en ambas direcciones." },
      { name: "Estiramiento de flexores", seconds: 30, cue: "Palma hacia arriba, baja los dedos suavemente con la otra mano." },
      { name: "Estiramiento de extensores", seconds: 30, cue: "Palma hacia abajo, lleva el dorso de la mano hacia ti." },
      { name: "Sacude y suelta", seconds: 30, cue: "Sacude las manos como si las secaras al aire, dedos bien abiertos." },
    ],
  },
  {
    id: "piernas",
    name: "Piernas despiertas",
    focus: "Cadera y piernas",
    minutes: 4,
    color: "#8FE388",
    icon: "Footprints",
    xp: 40,
    exercises: [
      { name: "Sentadilla a la silla", seconds: 40, cue: "Siéntate y levántate de la silla sin usar las manos, lento y controlado." },
      { name: "Elevación de talones", seconds: 35, cue: "De pie, sube en puntas de pie y baja despacio. Repite al ritmo." },
      { name: "Círculos de cadera", seconds: 35, cue: "Manos en la cintura, dibuja círculos grandes con la cadera." },
      { name: "Isquiotibiales", seconds: 40, cue: "Pierna extendida con el talón apoyado, inclina el torso hacia adelante." },
      { name: "Marcha en el lugar", seconds: 40, cue: "Camina en el sitio elevando las rodillas, brazos activos." },
    ],
  },
  {
    id: "ojos",
    name: "Ojos y mente",
    focus: "Vista y respiración",
    minutes: 2,
    color: "#FFA9D6",
    icon: "Eye",
    xp: 20,
    exercises: [
      { name: "Regla 20-20-20", seconds: 30, cue: "Mira un punto lejano (a más de 6 metros) y parpadea con calma." },
      { name: "Palmeo relajante", seconds: 30, cue: "Cubre tus ojos con las palmas (sin presionar) y respira hondo." },
      { name: "Respiración 4-7-8", seconds: 40, cue: "Inhala 4 s, sostén 7 s, exhala 8 s. Repite 3 veces." },
      { name: "Cuello suave", seconds: 20, cue: "Termina con una inclinación suave de cuello a cada lado." },
    ],
  },
  {
    id: "total",
    name: "Reset total",
    focus: "Cuerpo completo",
    minutes: 5,
    color: "#FF7461",
    icon: "Zap",
    xp: 50,
    exercises: [
      { name: "Jumping jacks suaves", seconds: 40, cue: "Saltos de tijera suaves o elevando brazos si prefieres sin impacto." },
      { name: "Estiramiento al cielo", seconds: 35, cue: "Entrelaza dedos, palmas al techo y estira todo el cuerpo en puntas." },
      { name: "Rotación de tronco", seconds: 35, cue: "Brazos sueltos, gira el torso de lado a lado con cadera estable." },
      { name: "Movilidad de tobillos", seconds: 35, cue: "Círculos con cada tobillo, 10 por lado, apóyate en la silla si quieres." },
      { name: "Sentadilla libre", seconds: 40, cue: "Sentadillas al ritmo que puedas, espalda neutra." },
      { name: "Respiración final", seconds: 35, cue: "Brazos suben al inhalar, bajan al exhalar. 5 respiraciones completas." },
    ],
  },
];

export function routineById(id: string): Routine {
  return ROUTINES.find((r) => r.id === id) ?? ROUTINES[0];
}
