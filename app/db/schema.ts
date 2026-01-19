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

// --- 1. USERS TABLE (Matches your SQLModel) ---
export const users = pgTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"), // "picture" in your old model
  password: text("password"), // "hashed_password"
  
  // Custom Fields from your Python Schema
  isAdmin: boolean("is_admin").default(false),
  credits: integer("credits").default(0),
  referralCode: text("referral_code").unique(), 
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()),
});


export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(), // User email
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => ({
    compoundKey: primaryKey({ columns: [vt.identifier, vt.token] }),
  })
);

export const passwordResetTokens = pgTable(
  "passwordResetToken",
  {
    identifier: text("identifier").notNull(), // User email
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (t) => ({
    compoundKey: primaryKey({ columns: [t.identifier, t.token] }),
  })
);

// --- 2. AUTH.JS REQUIRED TABLES (Do not modify) ---
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
  })
);

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

// --- 3. YOUR CUSTOM TABLES (Generations & Transactions) ---

// Transactions (Top-ups only)
export const transactions = pgTable("transactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  amount: real("amount").notNull(),
  currency: text("currency").notNull(), // 'USD' or 'INR'
  credits: integer("credits").notNull(),
  status: text("status").notNull().default("pending"), // pending, completed, failed
  provider: text("provider").notNull(), // 'paypal' or 'razorpay'
  providerTransactionId: text("provider_transaction_id"), // PayPal Order ID
  createdAt: timestamp("created_at").defaultNow(),
});

// Image Generations
export const imageGenerations = pgTable("image_generation", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  prompt: text("prompt").notNull(),
  model: text("model").notNull(),
  imageUrl: text("image_url"),
  cost: integer("cost").notNull(),
  status: text("status").default("processing"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Video Generations
export const videoGenerations = pgTable("video_generation", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  prompt: text("prompt").notNull(),
  model: text("model").notNull(),
  videoUrl: text("video_url"),
  cost: integer("cost").notNull(),
  status: text("status").default("processing"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Audio/Voice Generations
export const voiceGenerations = pgTable("voice_generation", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  prompt: text("prompt").notNull(), // Or transcript
  voiceId: text("voice_id"),
  audioUrl: text("audio_url"),
  cost: integer("cost").notNull(),
  status: text("status").default("processing"),
  createdAt: timestamp("created_at").defaultNow(),
});


// ✅ AI Models Table
export const aiModels = pgTable("ai_models", {
  id: serial("id").primaryKey(), // Using serial (1, 2, 3) to match your dummy data
  name: text("name").notNull(),    // "Flux.1 Pro"
  type: text("type").notNull(),    // "Image", "Video"
  icon: text("icon").notNull(),    // "/icons/flux.png"
  description: text("description"), 
  rating: real("rating").default(5.0),
  link: text("link"),
  badge: text("badge"),            
});

// ✅ AI Tools Table
export const aiTools = pgTable("ai_tools", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),      // "Face Swap"
  description: text("description"),
  imageUrl: text("image_url"),       // "/tools/face-swap.webm"
  link: text("link"),                // "/dashboard/tools/face-swap"
  badge: text("badge"),              // "Popular"
});

// ✅ Carousel Slides Table
export const carousels = pgTable("carousels", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),          // "Unleash Your Creativity"
  description: text("description"),
  imageUrl: text("image_url").notNull(),   // "/carousel/see.png"
  ctaText: text("cta_text"),               // "Start Generating"
  ctaLink: text("cta_link"),               // "/dashboard/generate/image"
  order: integer("order").default(0),      // To control slide order
  isActive: boolean("is_active").default(true),
});

// --- 4. RELATIONS (FIXED) ---

// User side (One User has Many of these)
export const usersRelations = relations(users, ({ many }) => ({
  transactions: many(transactions),
  images: many(imageGenerations),
  videos: many(videoGenerations),
  voices: many(voiceGenerations),
}));

// Transaction Side (One Transaction belongs to One User)
export const transactionsRelations = relations(transactions, ({ one }) => ({
  user: one(users, {
    fields: [transactions.userId],
    references: [users.id],
  }),
}));

// ✅ NEW: Image Side (One Image belongs to One User)
export const imageGenerationsRelations = relations(imageGenerations, ({ one }) => ({
  user: one(users, {
    fields: [imageGenerations.userId],
    references: [users.id],
  }),
}));

// ✅ NEW: Video Side (One Video belongs to One User)
export const videoGenerationsRelations = relations(videoGenerations, ({ one }) => ({
  user: one(users, {
    fields: [videoGenerations.userId],
    references: [users.id],
  }),
}));

// ✅ NEW: Voice Side (One Voice belongs to One User)
export const voiceGenerationsRelations = relations(voiceGenerations, ({ one }) => ({
  user: one(users, {
    fields: [voiceGenerations.userId],
    references: [users.id],
  }),
}));


export const contactSubmissions = pgTable("contact_submission", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  subject: text("subject"),
  message: text("message").notNull(),
  ipAddress: text("ip_address"), // Important for Rate Limiting
  createdAt: timestamp("created_at").defaultNow(),
});