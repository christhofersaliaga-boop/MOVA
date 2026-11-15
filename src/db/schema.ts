import {
  pgTable,
  serial,
  integer,
  text,
  boolean,
  timestamp,
  jsonb,
  doublePrecision,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  avatar: text("avatar").notNull().default("spark"),
  xp: integer("xp").notNull().default(0),
  streak: integer("streak").notNull().default(1),
  lastActiveDate: text("last_active_date"),
  sedentaryMinutes: integer("sedentary_minutes").notNull().default(40),
  notifyEnabled: boolean("notify_enabled").notNull().default(true),
  voiceEnabled: boolean("voice_enabled").notNull().default(true),
  isAdmin: boolean("is_admin").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const bodyMetrics = pgTable("body_metrics", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  weightKg: doublePrecision("weight_kg").notNull(),
  heightCm: doublePrecision("height_cm").notNull(),
  bmi: doublePrecision("bmi").notNull(),
  date: text("date").notNull(), // YYYY-MM-DD local
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // walk | routine | stretch | steps | challenge | custom
  title: text("title").notNull(),
  minutes: integer("minutes").notNull().default(0),
  steps: integer("steps").notNull().default(0),
  xp: integer("xp").notNull().default(0),
  date: text("date").notNull(), // YYYY-MM-DD local
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const challenges = pgTable("challenges", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  icon: text("icon").notNull().default("Zap"),
  target: integer("target").notNull().default(1),
  progress: integer("progress").notNull().default(0),
  unit: text("unit").notNull().default("veces"),
  xp: integer("xp").notNull().default(20),
  tier: text("tier").notNull().default("facil"), // facil | medio | pro | custom
  date: text("date").notNull(),
  completed: boolean("completed").notNull().default(false),
  generated: boolean("generated").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const reminders = pgTable("reminders", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  time: text("time").notNull(), // HH:MM
  days: jsonb("days").$type<number[]>().notNull(), // 0=Domingo ... 6=Sabado
  kind: text("kind").notNull().default("break"), // break | water | posture | custom
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const scheduleBlocks = pgTable("schedule_blocks", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  day: integer("day").notNull(), // 0=Domingo ... 6=Sabado
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  location: text("location"),
  color: text("color").notNull().default("#7C6CFF"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const unlockedAvatars = pgTable("unlocked_avatars", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  avatarId: text("avatar_id").notNull(),
  unlockedAt: timestamp("unlocked_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type User = typeof users.$inferSelect;
export type Activity = typeof activities.$inferSelect;
export type Challenge = typeof challenges.$inferSelect;
export type Reminder = typeof reminders.$inferSelect;
export type ScheduleBlock = typeof scheduleBlocks.$inferSelect;
