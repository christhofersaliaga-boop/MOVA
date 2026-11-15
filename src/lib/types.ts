import type { User } from "@/db/schema";

export type PublicUser = {
  id: number;
  name: string;
  email: string;
  avatar: string;
  xp: number;
  streak: number;
  sedentaryMinutes: number;
  notifyEnabled: boolean;
  voiceEnabled: boolean;
  isAdmin: boolean;
};

export function toPublicUser(u: User): PublicUser {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    avatar: u.avatar,
    xp: u.xp,
    streak: u.streak,
    sedentaryMinutes: u.sedentaryMinutes,
    notifyEnabled: u.notifyEnabled,
    voiceEnabled: u.voiceEnabled,
    isAdmin: u.isAdmin,
  };
}

export interface AdminUserDTO {
  id: number;
  name: string;
  email: string;
  avatar: string;
  isAdmin: boolean;
  xp: number;
  level: number;
  streak: number;
  lastActiveDate: string | null;
  createdAt: string;
  activeToday: boolean;
  totals: { minutes: number; steps: number; routines: number; breaks: number };
  challengesDone: number;
  challengesTotal: number;
  latestBmi: number | null;
  latestWeight: number | null;
}

export interface AdminUserDetailDTO {
  user: AdminUserDTO;
  daySeries: { key: string; label: string; minutes: number; steps: number }[];
  recent: ActivityDTO[];
  metrics: BodyMetricDTO[];
  avatars: string[];
  remindersCount: number;
  blocksCount: number;
}

export interface BodyMetricDTO {
  id: number;
  weightKg: number;
  heightCm: number;
  bmi: number;
  date: string;
}

export interface ActivityDTO {
  id: number;
  type: string;
  title: string;
  minutes: number;
  steps: number;
  xp: number;
  date: string;
}

export interface ChallengeDTO {
  id: number;
  title: string;
  description: string;
  icon: string;
  target: number;
  progress: number;
  unit: string;
  xp: number;
  tier: string;
  date: string;
  completed: boolean;
  generated: boolean;
}

export interface ReminderDTO {
  id: number;
  title: string;
  time: string;
  days: number[];
  kind: string;
  enabled: boolean;
}

export interface BlockDTO {
  id: number;
  title: string;
  day: number;
  startTime: string;
  endTime: string;
  location: string | null;
  color: string;
}

export interface GamificationState {
  xp: number;
  level: number;
  into: number;
  needed: number;
  streak: number;
}

export interface StatsResponse {
  user: PublicUser & { level: number; into: number; needed: number };
  today: { minutes: number; steps: number; breaks: number; xp: number };
  week: { key: string; label: string; minutes: number; steps: number }[];
  challenges: ChallengeDTO[];
  recent: ActivityDTO[];
  totals: { minutes: number; steps: number; routines: number };
  unlockedAvatars: string[];
}
