import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage.js";
import { insertUrlSchema, insertUserSchema, bulkUrlSchema, type User } from "../shared/schema.js";
import { generateQRCode, parseUserAgent, extractDomain, hashPassword, verifyPassword, generateToken, verifyToken } from "./utils.js";
import { nanoid } from "nanoid";

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

// Auth middleware
const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return next(); // Allow anonymous access
  }

  const decoded = verifyToken(token);
  if (decoded) {
    const user = await storage.getUser(decoded.userId);
    if (user) {
      req.user = user;
    }
  }
  
  next();
};

// Require authentication middleware
const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
};

export async function registerRoutes(app: Express): Promise<Server> {
  app.use(authenticateToken);

  // Auth routes
  app.post('/api/auth/register', async (req: Request, res: Response) => {
    try {
      const { email, username, password, firstName, lastName } = req.body;
      
      // Check if user exists
      const existingUser = await storage.getUserByEmail(email) || await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }

      const passwordHash = await hashPassword(password);
      const user = await storage.createUser({
        email,
        username,
        firstName,
        lastName,
        passwordHash,
      });

      const token = generateToken({ userId: user.id });
      const { passwordHash: _, ...userWithoutPassword } = user;
      
      res.json({ token, user: userWithoutPassword });
    } catch (error: any) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  app.post('/api/auth/login', async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;
      
      const user = await storage.getUserByEmail(email);
      if (!user || !user.passwordHash) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const isValid = await verifyPassword(password, user.passwordHash);
      if (!isValid) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const token = generateToken({ userId: user.id });
      const { passwordHash: _, ...userWithoutPassword } = user;
      
      res.json({ token, user: userWithoutPassword });
    } catch (error: any) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.get('/api/auth/user', requireAuth, async (req: Request, res: Response) => {
    const { passwordHash: _, ...userWithoutPassword } = req.user!;
    res.json(userWithoutPassword);
  });

  // URL shortening routes
  app.post('/api/urls', async (req: Request, res: Response) => {
    try {
      const validatedData = insertUrlSchema.parse(req.body);
      
      // Check if custom alias is taken
      if (validatedData.customAlias) {
        const isAliasUsed = await storage.checkCustomAlias(validatedData.customAlias);
        if (isAliasUsed) {
          return res.status(400).json({ message: "Custom alias is already taken" });
        }
      }

      const shortCode = validatedData.customAlias || nanoid(8);
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const shortUrl = `${baseUrl}/${shortCode}`;
      
      // Generate QR code
      const qrCodeDataUrl = await generateQRCode(shortUrl);

      const url = await storage.createUrl({
        ...validatedData,
        shortCode,
        userId: req.user?.id,
        qrCodeUrl: qrCodeDataUrl,
      });

      res.json({
        id: url.id,
        originalUrl: url.originalUrl,
        shortUrl,
        shortCode: url.shortCode,
        customAlias: url.customAlias,
        qrCodeUrl: url.qrCodeUrl,
        createdAt: url.createdAt,
      });
    } catch (error: any) {
      console.error("URL creation error:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Failed to create short URL" });
    }
  });

  // Bulk URL shortening
  app.post('/api/urls/bulk', requireAuth, async (req: Request, res: Response) => {
    try {
      const validatedData = bulkUrlSchema.parse(req.body);
      const results: any[] = [];
      const errors: any[] = [];

      for (const urlData of validatedData.urls) {
        try {
          // Check if custom alias is taken
          if (urlData.customAlias) {
            const isAliasUsed = await storage.checkCustomAlias(urlData.customAlias);
            if (isAliasUsed) {
              errors.push({ originalUrl: urlData.originalUrl, error: "Custom alias is already taken" });
              continue;
            }
          }

          const shortCode = urlData.customAlias || nanoid(8);
          const baseUrl = `${req.protocol}://${req.get('host')}`;
          const shortUrl = `${baseUrl}/${shortCode}`;
          
          const qrCodeDataUrl = await generateQRCode(shortUrl);

          const url = await storage.createUrl({
            ...urlData,
            shortCode,
            userId: req.user!.id,
            qrCodeUrl: qrCodeDataUrl,
          });

          results.push({
            id: url.id,
            originalUrl: url.originalUrl,
            shortUrl,
            shortCode: url.shortCode,
            customAlias: url.customAlias,
            qrCodeUrl: url.qrCodeUrl,
            createdAt: url.createdAt,
          });
        } catch (error: any) {
          errors.push({ originalUrl: urlData.originalUrl, error: error.message });
        }
      }

      res.json({ results, errors });
    } catch (error: any) {
      console.error("Bulk URL creation error:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Failed to create short URLs" });
    }
  });

  // Get user's URLs
  app.get('/api/urls', requireAuth, async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = (page - 1) * limit;

      const urls = await storage.getUserUrls(req.user!.id, limit, offset);
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      
      const urlsWithShortUrl = urls.map(url => ({
        ...url,
        shortUrl: `${baseUrl}/${url.shortCode}`,
      }));

      res.json({ urls: urlsWithShortUrl, page, limit });
    } catch (error: any) {
      console.error("Error fetching URLs:", error);
      res.status(500).json({ message: "Failed to fetch URLs" });
    }
  });

  // Get URL analytics
  app.get('/api/urls/:id/analytics', requireAuth, async (req: Request, res: Response) => {
    try {
      const url = await storage.getUrlById(req.params.id);
      if (!url || url.userId !== req.user!.id) {
        return res.status(404).json({ message: "URL not found" });
      }

      const analytics = await storage.getUrlAnalytics(url.id);
      const clicks = await storage.getUrlClicks(url.id, 100);

      res.json({
        url: {
          ...url,
          shortUrl: `${req.protocol}://${req.get('host')}/${url.shortCode}`,
        },
        analytics,
        recentClicks: clicks,
      });
    } catch (error: any) {
      console.error("Error fetching analytics:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  // Update URL
  app.put('/api/urls/:id', requireAuth, async (req: Request, res: Response) => {
    try {
      const url = await storage.getUrlById(req.params.id);
      if (!url || url.userId !== req.user!.id) {
        return res.status(404).json({ message: "URL not found" });
      }

      const updates = req.body;
      
      // If updating custom alias, check availability
      if (updates.customAlias && updates.customAlias !== url.customAlias) {
        const isAliasUsed = await storage.checkCustomAlias(updates.customAlias);
        if (isAliasUsed) {
          return res.status(400).json({ message: "Custom alias is already taken" });
        }
        updates.shortCode = updates.customAlias;
      }

      const updatedUrl = await storage.updateUrl(req.params.id, updates);
      res.json({
        ...updatedUrl,
        shortUrl: `${req.protocol}://${req.get('host')}/${updatedUrl.shortCode}`,
      });
    } catch (error: any) {
      console.error("Error updating URL:", error);
      res.status(500).json({ message: "Failed to update URL" });
    }
  });

  // Delete URL
  app.delete('/api/urls/:id', requireAuth, async (req: Request, res: Response) => {
    try {
      const url = await storage.getUrlById(req.params.id);
      if (!url || url.userId !== req.user!.id) {
        return res.status(404).json({ message: "URL not found" });
      }

      await storage.deleteUrl(req.params.id);
      res.json({ message: "URL deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting URL:", error);
      res.status(500).json({ message: "Failed to delete URL" });
    }
  });

  // Redirect route
  app.get('/:shortCode', async (req: Request, res: Response) => {
    try {
      const { shortCode } = req.params;
      const url = await storage.getUrl(shortCode);
      
      if (!url) {
        return res.status(404).send('URL not found');
      }

      // Record click analytics
      const userAgent = req.headers['user-agent'] || '';
      const { browser, os, device } = parseUserAgent(userAgent);
      const referer = extractDomain(req.headers.referer || '');
      
      // Get country from IP (in production, use a service like MaxMind)
      const ipAddress = req.ip || req.connection.remoteAddress || '';
      const country = 'US'; // Placeholder

      await storage.recordClick({
        urlId: url.id,
        ipAddress,
        userAgent,
        referer: req.headers.referer || null,
        country,
        device,
        browser,
        os,
      });

      res.redirect(301, url.originalUrl);
    } catch (error: any) {
      console.error("Redirect error:", error);
      res.status(500).send('Server error');
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}