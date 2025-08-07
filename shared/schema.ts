import { sql } from 'drizzle-orm';
import { 
  pgTable, 
  varchar, 
  timestamp, 
  text, 
  integer, 
  boolean, 
  jsonb,
  index 
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for authentication
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  username: varchar("username").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  passwordHash: varchar("password_hash"),
  isPremium: boolean("is_premium").default(false),
  stripeCustomerId: varchar("stripe_customer_id"),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// URLs table for shortened links
export const urls = pgTable("urls", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  originalUrl: text("original_url").notNull(),
  shortCode: varchar("short_code", { length: 12 }).notNull().unique(),
  customAlias: varchar("custom_alias", { length: 50 }),
  title: varchar("title", { length: 200 }),
  description: text("description"),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'set null' }),
  isActive: boolean("is_active").default(true),
  qrCodeUrl: varchar("qr_code_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  expiresAt: timestamp("expires_at"), // null means never expires
});

// URL clicks table for analytics
export const urlClicks = pgTable("url_clicks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  urlId: varchar("url_id").references(() => urls.id, { onDelete: 'cascade' }).notNull(),
  ipAddress: varchar("ip_address", { length: 45 }), // IPv6 compatible
  userAgent: text("user_agent"),
  referer: text("referer"),
  country: varchar("country", { length: 2 }), // ISO country code
  city: varchar("city", { length: 100 }),
  device: varchar("device", { length: 50 }),
  browser: varchar("browser", { length: 50 }),
  os: varchar("os", { length: 50 }),
  clickedAt: timestamp("clicked_at").defaultNow(),
});

// URL analytics aggregated data
export const urlAnalytics = pgTable("url_analytics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  urlId: varchar("url_id").references(() => urls.id, { onDelete: 'cascade' }).notNull().unique(),
  totalClicks: integer("total_clicks").default(0),
  uniqueClicks: integer("unique_clicks").default(0),
  clicksByCountry: jsonb("clicks_by_country").$type<Record<string, number>>().default({}),
  clicksByDevice: jsonb("clicks_by_device").$type<Record<string, number>>().default({}),
  clicksByBrowser: jsonb("clicks_by_browser").$type<Record<string, number>>().default({}),
  clicksByReferer: jsonb("clicks_by_referer").$type<Record<string, number>>().default({}),
  dailyClicks: jsonb("daily_clicks").$type<Record<string, number>>().default({}),
  lastClickAt: timestamp("last_click_at"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const userRelations = relations(users, ({ many }) => ({
  urls: many(urls),
}));

export const urlRelations = relations(urls, ({ one, many }) => ({
  user: one(users, {
    fields: [urls.userId],
    references: [users.id],
  }),
  clicks: many(urlClicks),
  analytics: one(urlAnalytics),
}));

export const urlClickRelations = relations(urlClicks, ({ one }) => ({
  url: one(urls, {
    fields: [urlClicks.urlId],
    references: [urls.id],
  }),
}));

export const urlAnalyticsRelations = relations(urlAnalytics, ({ one }) => ({
  url: one(urls, {
    fields: [urlAnalytics.urlId],
    references: [urls.id],
  }),
}));

// Zod schemas for validation
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUrlSchema = createInsertSchema(urls).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  originalUrl: z.string().url("Please enter a valid URL"),
  customAlias: z.string().min(3, "Alias must be at least 3 characters").max(50).regex(/^[a-zA-Z0-9_-]+$/, "Alias can only contain letters, numbers, hyphens, and underscores").optional(),
});

export const bulkUrlSchema = z.object({
  urls: z.array(z.object({
    originalUrl: z.string().url("Please enter a valid URL"),
    customAlias: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_-]+$/).optional(),
  })).min(1).max(100),
});

export const insertUrlClickSchema = createInsertSchema(urlClicks).omit({
  id: true,
  clickedAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpsertUser = typeof users.$inferInsert;

export type Url = typeof urls.$inferSelect;
export type InsertUrl = z.infer<typeof insertUrlSchema>;
export type BulkUrls = z.infer<typeof bulkUrlSchema>;

export type UrlClick = typeof urlClicks.$inferSelect;
export type InsertUrlClick = z.infer<typeof insertUrlClickSchema>;

export type UrlAnalytics = typeof urlAnalytics.$inferSelect;

export type UrlWithAnalytics = Url & {
  analytics?: UrlAnalytics;
  _count?: {
    clicks: number;
  };
};