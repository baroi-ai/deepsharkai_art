// db/schema.ts
import {
  timestamp,
  pgTable,
  text,
  primaryKey,
  integer,
  boolean,
  uuid,
  real,
  serial,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import type { AdapterAccount } from "next-auth/adapters";

// =========================================
// 1. TABLE DEFINITIONS
// =========================================

// --- USERS TABLE ---
export const users = pgTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
  password: text("password"),

  // Custom Fields
  isAdmin: boolean("is_admin").default(false),
  credits: integer("credits").default(0),
  referralCode: text("referral_code").unique(),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date()),
});

// --- AUTH.JS TABLES ---
export const accounts = pgTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccount>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => ({
    compoundKey: primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
  }),
);

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => ({
    compoundKey: primaryKey({ columns: [vt.identifier, vt.token] }),
  }),
);

export const passwordResetTokens = pgTable(
  "passwordResetToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (t) => ({
    compoundKey: primaryKey({ columns: [t.identifier, t.token] }),
  }),
);

// --- TRANSACTIONS (Top-ups) ---
export const transactions = pgTable("transactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  amount: real("amount").notNull(),
  currency: text("currency").notNull(),
  credits: integer("credits").notNull(),
  status: text("status").notNull().default("pending"),
  provider: text("provider").notNull(),
  providerTransactionId: text("provider_transaction_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

// --- SUBSCRIPTIONS ---
export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  planId: text("plan_id").notNull(),
  provider: text("provider").notNull(), // 'razorpay' or 'paypal'
  subscriptionId: text("subscription_id").unique().notNull(),
  status: text("status").notNull().default("active"),
  currentPeriodStart: timestamp("current_period_start"),
  currentPeriodEnd: timestamp("current_period_end"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date()),
});

// --- GENERATIONS ---
export const imageGenerations = pgTable("image_generation", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  prompt: text("prompt").notNull(),
  model: text("model").notNull(),
  imageUrl: text("image_url"),
  fallbackUrl: text("fallback_url"),
  cost: integer("cost").notNull(),
  status: text("status").default("processing"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const videoGenerations = pgTable("video_generation", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  prompt: text("prompt").notNull(),
  model: text("model").notNull(),
  videoUrl: text("video_url"),
  fallbackUrl: text("fallback_url"),
  cost: integer("cost").notNull(),
  status: text("status").default("processing"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const voiceGenerations = pgTable("voice_generation", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  prompt: text("prompt").notNull(),
  voiceId: text("voice_id"),
  audioUrl: text("audio_url"),
  fallbackUrl: text("fallback_url"),
  cost: integer("cost").notNull(),
  status: text("status").default("processing"),
  createdAt: timestamp("created_at").defaultNow(),
});

// --- CONTENT TABLES ---
export const aiModels = pgTable("ai_models", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  icon: text("icon").notNull(),
  description: text("description"),
  rating: real("rating").default(5.0),
  link: text("link"),
  badge: text("badge"),
});

export const aiTools = pgTable("ai_tools", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  link: text("link"),
  badge: text("badge"),
  category: text("category"),
});

export const carousels = pgTable("carousels", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  imageUrl: text("image_url").notNull(),
  ctaText: text("cta_text"),
  ctaLink: text("cta_link"),
  order: integer("order").default(0),
  isActive: boolean("is_active").default(true),
});

export const contactSubmissions = pgTable("contact_submission", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  subject: text("subject"),
  message: text("message").notNull(),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at").defaultNow(),
});

// =========================================
// 2. RELATIONS (Must be defined AFTER tables)
// =========================================

export const usersRelations = relations(users, ({ many }) => ({
  transactions: many(transactions),
  subscriptions: many(subscriptions), // ✅ Added Subscriptions
  images: many(imageGenerations),
  videos: many(videoGenerations),
  voices: many(voiceGenerations),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  user: one(users, {
    fields: [transactions.userId],
    references: [users.id],
  }),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  user: one(users, {
    fields: [subscriptions.userId],
    references: [users.id],
  }),
}));

export const imageGenerationsRelations = relations(
  imageGenerations,
  ({ one }) => ({
    user: one(users, {
      fields: [imageGenerations.userId],
      references: [users.id],
    }),
  }),
);

export const videoGenerationsRelations = relations(
  videoGenerations,
  ({ one }) => ({
    user: one(users, {
      fields: [videoGenerations.userId],
      references: [users.id],
    }),
  }),
);

export const voiceGenerationsRelations = relations(
  voiceGenerations,
  ({ one }) => ({
    user: one(users, {
      fields: [voiceGenerations.userId],
      references: [users.id],
    }),
  }),
);
