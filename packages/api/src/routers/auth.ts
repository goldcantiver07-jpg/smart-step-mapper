import { z } from "zod";
import { publicProcedure } from "../index";
import { db } from "@smart-step-mapper/db";
import { users } from "@smart-step-mapper/db/schema";
import { eq } from "drizzle-orm";
import { hashPassword, verifyPassword } from "../utils/password";
import { signToken } from "../utils/jwt";

export const authRouter = {
  register: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(6),
        displayName: z.string().min(1).max(100),
      }),
    )
    .handler(async ({ input }) => {
      const [existing] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, input.email))
        .limit(1);
      if (existing) {
        throw new Error("Email already registered");
      }

      const passwordHash = await hashPassword(input.password);
      const [user] = await db
        .insert(users)
        .values({
          email: input.email,
          displayName: input.displayName,
          passwordHash,
        })
        .returning({ id: users.id, email: users.email, displayName: users.displayName });

      const token = await signToken({ userId: user.id });
      return { user, token };
    }),

  login: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(1),
      }),
    )
    .handler(async ({ input }) => {
      const [found] = await db
        .select()
        .from(users)
        .where(eq(users.email, input.email))
        .limit(1);
      if (!found) {
        throw new Error("Invalid email or password");
      }

      const valid = await verifyPassword(input.password, found.passwordHash);
      if (!valid) {
        throw new Error("Invalid email or password");
      }

      const token = await signToken({ userId: found.id });
      return {
        user: { id: found.id, email: found.email, displayName: found.displayName },
        token,
      };
    }),

  me: publicProcedure.handler(async ({ context }) => {
    if (!context.user) {
      throw new Error("Not authenticated");
    }
    return context.user;
  }),
};
