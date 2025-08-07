import { 
  users, 
  urls, 
  urlClicks, 
  urlAnalytics,
  type User, 
  type InsertUser, 
  type UpsertUser,
  type Url,
  type InsertUrl,
  type UrlClick,
  type InsertUrlClick,
  type UrlAnalytics,
  type UrlWithAnalytics
} from "../shared/schema.js";
import { db } from "./db";
import { eq, desc, sql, and, gte } from "drizzle-orm";
import { nanoid } from "nanoid";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(insertUser: InsertUser): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserPremiumStatus(userId: string, isPremium: boolean, stripeCustomerId?: string, stripeSubscriptionId?: string): Promise<User>;
  
  // URL operations
  getUrl(shortCode: string): Promise<Url | undefined>;
  getUrlById(id: string): Promise<UrlWithAnalytics | undefined>;
  getUserUrls(userId: string, limit?: number, offset?: number): Promise<UrlWithAnalytics[]>;
  createUrl(insertUrl: Omit<InsertUrl, 'shortCode'> & { shortCode?: string, qrCodeUrl?: string }): Promise<Url>;
  updateUrl(id: string, updates: Partial<InsertUrl>): Promise<Url>;
  deleteUrl(id: string): Promise<void>;
  checkCustomAlias(alias: string): Promise<boolean>;
  
  // Analytics operations
  recordClick(insertClick: InsertUrlClick): Promise<void>;
  updateUrlAnalytics(urlId: string): Promise<void>;
  getUrlAnalytics(urlId: string, days?: number): Promise<UrlAnalytics | undefined>;
  getUrlClicks(urlId: string, limit?: number, offset?: number): Promise<UrlClick[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUserPremiumStatus(userId: string, isPremium: boolean, stripeCustomerId?: string, stripeSubscriptionId?: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        isPremium,
        stripeCustomerId,
        stripeSubscriptionId,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  // URL operations
  async getUrl(shortCode: string): Promise<Url | undefined> {
    const [url] = await db.select().from(urls).where(
      and(
        eq(urls.shortCode, shortCode),
        eq(urls.isActive, true)
      )
    );
    return url;
  }

  async getUrlById(id: string): Promise<UrlWithAnalytics | undefined> {
    const [result] = await db
      .select({
        url: urls,
        analytics: urlAnalytics,
      })
      .from(urls)
      .leftJoin(urlAnalytics, eq(urls.id, urlAnalytics.urlId))
      .where(eq(urls.id, id));

    if (!result) return undefined;

    return {
      ...result.url,
      analytics: result.analytics || undefined,
    };
  }

  async getUserUrls(userId: string, limit: number = 50, offset: number = 0): Promise<UrlWithAnalytics[]> {
    const results = await db
      .select({
        url: urls,
        analytics: urlAnalytics,
      })
      .from(urls)
      .leftJoin(urlAnalytics, eq(urls.id, urlAnalytics.urlId))
      .where(and(eq(urls.userId, userId), eq(urls.isActive, true)))
      .orderBy(desc(urls.createdAt))
      .limit(limit)
      .offset(offset);

    return results.map(result => ({
      ...result.url,
      analytics: result.analytics || undefined,
    }));
  }

  async createUrl(insertUrl: Omit<InsertUrl, 'shortCode'> & { shortCode?: string, qrCodeUrl?: string }): Promise<Url> {
    const shortCode = insertUrl.shortCode || this.generateShortCode();
    
    const [url] = await db
      .insert(urls)
      .values({
        ...insertUrl,
        shortCode,
      })
      .returning();

    // Create analytics record
    await db.insert(urlAnalytics).values({
      urlId: url.id,
      totalClicks: 0,
      uniqueClicks: 0,
    });

    return url;
  }

  async updateUrl(id: string, updates: Partial<InsertUrl>): Promise<Url> {
    const [url] = await db
      .update(urls)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(urls.id, id))
      .returning();
    return url;
  }

  async deleteUrl(id: string): Promise<void> {
    await db.update(urls).set({ isActive: false }).where(eq(urls.id, id));
  }

  async checkCustomAlias(alias: string): Promise<boolean> {
    const [existing] = await db
      .select({ id: urls.id })
      .from(urls)
      .where(
        and(
          eq(urls.shortCode, alias),
          eq(urls.isActive, true)
        )
      )
      .limit(1);
    return !!existing;
  }

  // Analytics operations
  async recordClick(insertClick: InsertUrlClick): Promise<void> {
    await db.insert(urlClicks).values(insertClick);
    await this.updateUrlAnalytics(insertClick.urlId);
  }

  async updateUrlAnalytics(urlId: string): Promise<void> {
    // Get aggregated click data
    const clicksData = await db
      .select({
        totalClicks: sql<number>`count(*)::int`,
        uniqueClicks: sql<number>`count(distinct ${urlClicks.ipAddress})::int`,
        countries: sql<Record<string, number>>`
          json_object_agg(
            coalesce(${urlClicks.country}, 'Unknown'), 
            count(${urlClicks.country})
          )
        `,
        devices: sql<Record<string, number>>`
          json_object_agg(
            coalesce(${urlClicks.device}, 'Unknown'), 
            count(${urlClicks.device})
          )
        `,
        browsers: sql<Record<string, number>>`
          json_object_agg(
            coalesce(${urlClicks.browser}, 'Unknown'), 
            count(${urlClicks.browser})
          )
        `,
        referers: sql<Record<string, number>>`
          json_object_agg(
            coalesce(${urlClicks.referer}, 'Direct'), 
            count(${urlClicks.referer})
          )
        `,
        dailyClicks: sql<Record<string, number>>`
          json_object_agg(
            date(${urlClicks.clickedAt}), 
            count(*)
          )
        `,
        lastClick: sql<Date>`max(${urlClicks.clickedAt})`,
      })
      .from(urlClicks)
      .where(eq(urlClicks.urlId, urlId))
      .groupBy(urlClicks.urlId);

    if (clicksData.length > 0) {
      const data = clicksData[0];
      await db
        .insert(urlAnalytics)
        .values({
          urlId,
          totalClicks: data.totalClicks,
          uniqueClicks: data.uniqueClicks,
          clicksByCountry: data.countries,
          clicksByDevice: data.devices,
          clicksByBrowser: data.browsers,
          clicksByReferer: data.referers,
          dailyClicks: data.dailyClicks,
          lastClickAt: data.lastClick,
        })
        .onConflictDoUpdate({
          target: urlAnalytics.urlId,
          set: {
            totalClicks: data.totalClicks,
            uniqueClicks: data.uniqueClicks,
            clicksByCountry: data.countries,
            clicksByDevice: data.devices,
            clicksByBrowser: data.browsers,
            clicksByReferer: data.referers,
            dailyClicks: data.dailyClicks,
            lastClickAt: data.lastClick,
            updatedAt: new Date(),
          },
        });
    }
  }

  async getUrlAnalytics(urlId: string, days: number = 30): Promise<UrlAnalytics | undefined> {
    const [analytics] = await db
      .select()
      .from(urlAnalytics)
      .where(eq(urlAnalytics.urlId, urlId));
    return analytics;
  }

  async getUrlClicks(urlId: string, limit: number = 100, offset: number = 0): Promise<UrlClick[]> {
    const clicks = await db
      .select()
      .from(urlClicks)
      .where(eq(urlClicks.urlId, urlId))
      .orderBy(desc(urlClicks.clickedAt))
      .limit(limit)
      .offset(offset);
    return clicks;
  }

  private generateShortCode(): string {
    return nanoid(8);
  }
}

export const storage = new DatabaseStorage();