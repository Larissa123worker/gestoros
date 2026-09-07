import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../drizzle/schema";
import { eq } from "drizzle-orm";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db) {
    const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
    if (!connectionString) {
      throw new Error("Database connection string is not configured");
    }

    try {
      const client = postgres(connectionString, {
        prepare: false,
        max: 10,
        idle_timeout: 30,
      });
      _db = drizzle(client, { schema });
    } catch (error) {
      console.error("[Database] Failed to connect:", error);
      _db = null;
      throw error;
    }
  }

  return _db;
}

export async function upsertUser(user: {
  id?: string;
  name?: string | null;
  email?: string | null;
  loginMethod?: string | null;
  role?: string | null;
  lastSignedIn?: Date;
}) {
  const db = await getDb();

  const values: any = {
    id: user.id,
    name: user.name || null,
    email: user.email || null,
    loginMethod: user.loginMethod || null,
    role: user.role || "user",
    lastSignedIn: user.lastSignedIn || new Date(),
  };

  const updateSet: any = {
    name: values.name,
    email: values.email,
    loginMethod: values.loginMethod,
    role: values.role,
    lastSignedIn: values.lastSignedIn,
  };

  await db.insert(schema.users).values(values).onConflictDoUpdate({
    target: schema.users.id,
    set: updateSet,
  });
}

export async function getUserById(id: string) {
  const db = await getDb();
  const result = await db.select().from(schema.users).where(eq(schema.users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  const result = await db.select().from(schema.users).where(eq(schema.users.id, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}
