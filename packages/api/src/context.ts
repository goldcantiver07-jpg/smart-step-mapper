import { verifyToken, type JwtPayload } from "./utils/jwt";
import { db } from "@smart-step-mapper/db";
import { users } from "@smart-step-mapper/db/schema";
import { eq } from "drizzle-orm";

export type CreateContextOptions = {
  headers: Headers;
};

export async function createContext(options: CreateContextOptions) {
  let user: { id: string; email: string; displayName: string; createdAt: Date } | null = null;

  const cookieHeader = options.headers.get("cookie") ?? "";
  const tokenMatch = cookieHeader.match(/session=([^;]+)/);
  const token = tokenMatch?.[1];

  if (token) {
    try {
      const payload = await verifyToken(token);
      const [found] = await db
        .select({ id: users.id, email: users.email, displayName: users.displayName, createdAt: users.createdAt })
        .from(users)
        .where(eq(users.id, payload.userId))
        .limit(1);
      user = found ?? null;
    } catch {
      // invalid token — user stays null
    }
  }

  return { user };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
