import { COOKIE_NAME, ONE_YEAR_MS } from "../../shared/const.js";
import type { Express, Request, Response } from "express";
import { getUserByOpenId, upsertUser } from "../db";
import { getSessionCookieOptions } from "./cookies";
import { getSupabase } from "./supabase";

export function registerOAuthRoutes(app: Express) {
  app.get("/api/oauth/supabase", async (req: Request, res: Response) => {
    const provider = req.query.provider;
    if (provider !== "google" && provider !== "apple") {
      res.status(400).json({ error: "Invalid provider" });
      return;
    }

    const supabase = getSupabase();
    const redirectTo = `${req.protocol}://${req.get("host")}/api/oauth/callback`;

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: provider as "google" | "apple",
      options: { redirectTo },
    });

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    res.redirect(302, data.url);
  });

  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = req.query.code as string | undefined;
    if (!code) {
      res.status(400).json({ error: "Missing code" });
      return;
    }

    try {
      const supabase = getSupabase();
      const redirectTo = `${req.protocol}://${req.get("host")}/api/oauth/callback`;

      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (error || !data.user) {
        res.status(401).json({ error: "Invalid code" });
        return;
      }

      await upsertUser({
        id: data.user.id,
        name: data.user.user_metadata?.full_name ?? data.user.email ?? null,
        email: data.user.email ?? null,
        loginMethod: data.user.app_metadata?.provider ?? "email",
        lastSignedIn: new Date(),
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, data.session?.access_token ?? "", { ...cookieOptions, maxAge: ONE_YEAR_MS, httpOnly: true });

      const frontendUrl = process.env.EXPO_WEB_PREVIEW_URL || process.env.EXPO_PACKAGER_PROXY_URL || "http://localhost:8081";
      res.redirect(302, frontendUrl);
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });

  app.post("/api/auth/logout", (_req: Request, res: Response) => {
    const cookieOptions = getSessionCookieOptions(_req);
    res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    res.json({ success: true });
  });

  app.get("/api/auth/me", async (req: Request, res: Response) => {
    try {
      const user = await authenticateRequest(req);
      res.json({ user: buildUserResponse(user) });
    } catch (error) {
      console.error("[Auth] /api/auth/me failed:", error);
      res.status(401).json({ error: "Not authenticated", user: null });
    }
  });

  app.post("/api/auth/session", async (req: Request, res: Response) => {
    try {
      const user = await authenticateRequest(req);
      const authHeader = req.headers.authorization || req.headers.Authorization;
      if (typeof authHeader !== "string" || !authHeader.startsWith("Bearer ")) {
        res.status(400).json({ error: "Bearer token required" });
        return;
      }
      const token = authHeader.slice("Bearer ".length).trim();
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.json({ success: true, user: buildUserResponse(user) });
    } catch (error) {
      console.error("[Auth] /api/auth/session failed:", error);
      res.status(401).json({ error: "Invalid token" });
    }
  });
}

async function authenticateRequest(req: Request) {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  let token: string | undefined;
  if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
    token = authHeader.slice("Bearer ".length).trim();
  }

  const cookies = parseCookies(req.headers.cookie);
  const sessionCookie = token || cookies.get("app_session_id");
  if (!sessionCookie) {
    throw new Error("Missing session token");
  }

  const supabase = getSupabase();
  const { data, error } = await supabase.auth.getUser(sessionCookie as string);
  if (error || !data.user) {
    throw new Error("Invalid session token");
  }

  const db = await import("../db");
  let user = await db.getUserById(data.user.id);
  if (!user) {
    await db.upsertUser({
      id: data.user.id,
      name: data.user.user_metadata?.full_name ?? data.user.email ?? null,
      email: data.user.email ?? null,
      loginMethod: data.user.app_metadata?.provider ?? "email",
      lastSignedIn: new Date(),
    });
    user = await db.getUserById(data.user.id);
  } else {
    await db.upsertUser({
      id: user.id,
      name: user.name,
      email: user.email,
      loginMethod: user.loginMethod,
      lastSignedIn: new Date(),
    });
  }

  if (!user) {
    throw new Error("User not found");
  }

  return user;
}

function parseCookies(cookieHeader: string | undefined) {
  if (!cookieHeader) return new Map<string, string>();
  const parsed = require("cookie").parse(cookieHeader);
  return new Map(Object.entries(parsed));
}

function buildUserResponse(user: { id: string; name?: string | null; email?: string | null; loginMethod?: string | null; lastSignedIn?: Date }) {
  return {
    id: user.id,
    name: user.name ?? null,
    email: user.email ?? null,
    loginMethod: user.loginMethod ?? null,
    lastSignedIn: (user.lastSignedIn ?? new Date()).toISOString(),
  };
}
