import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { getSupabase } from "./supabase";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(opts: CreateExpressContextOptions): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    const authHeader = opts.req.headers.authorization || opts.req.headers.Authorization;
    let token: string | undefined;
    if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
      token = authHeader.slice("Bearer ".length).trim();
    }

    const cookieHeader = opts.req.headers.cookie;
    let cookieToken: string | undefined;
    if (cookieHeader) {
      const match = cookieHeader.match(/(?:^|;\s*)app_session_id=([^;]+)/);
      if (match) cookieToken = decodeURIComponent(match[1]);
    }

    const accessToken = token || cookieToken;
    if (accessToken) {
      const supabase = getSupabase();
      const { data, error } = await supabase.auth.getUser(accessToken);
      if (!error && data.user) {
        const db = await import("../db");
        let dbUser = await db.getUserById(data.user.id);
        if (!dbUser) {
          await db.upsertUser({
            id: data.user.id,
            name: data.user.user_metadata?.full_name ?? data.user.email ?? null,
            email: data.user.email ?? null,
            loginMethod: data.user.app_metadata?.provider ?? "email",
            lastSignedIn: new Date(),
          });
          dbUser = await db.getUserById(data.user.id);
        } else {
          await db.upsertUser({
            id: dbUser.id,
            name: dbUser.name,
            email: dbUser.email,
            loginMethod: dbUser.loginMethod,
            lastSignedIn: new Date(),
          });
        }
        user = dbUser ?? null;
      }
    }
  } catch (error) {
    console.error("[Auth] Failed to authenticate request:", error);
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
