import { z } from "zod";
import { ORPCError } from "@orpc/server";
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
        throw new ORPCError("CONFLICT", {
          message: "This email is already registered. Try signing in instead.",
        });
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

      if (!user) {
        throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "Account creation failed." });
      }
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
        throw new ORPCError("NOT_FOUND", {
          message: "No account found with this email. Would you like to create one?",
        });
      }

      const valid = await verifyPassword(input.password, found.passwordHash);
      if (!valid) {
        throw new ORPCError("UNAUTHORIZED", {
          message: "Incorrect password. Please try again.",
        });
      }

      const token = await signToken({ userId: found.id });
      return {
        user: { id: found.id, email: found.email, displayName: found.displayName },
        token,
      };
    }),

  me: publicProcedure.handler(async ({ context }) => {
    if (!context.user) {
      throw new ORPCError("UNAUTHORIZED", {
        message: "Not authenticated",
      });
    }
    return context.user;
  }),

  updateProfile: publicProcedure
    .input(
      z.object({
        displayName: z.string().min(1).max(100),
      }),
    )
    .handler(async ({ input, context }) => {
      if (!context.user) {
        throw new ORPCError("UNAUTHORIZED", { message: "Not authenticated" });
      }
      const [updated] = await db
        .update(users)
        .set({ displayName: input.displayName, updatedAt: new Date() })
        .where(eq(users.id, context.user.id))
        .returning({ id: users.id, email: users.email, displayName: users.displayName });
      return updated;
    }),

  changePassword: publicProcedure
    .input(
      z.object({
        currentPassword: z.string().min(1),
        newPassword: z.string().min(6),
      }),
    )
    .handler(async ({ input, context }) => {
      if (!context.user) {
        throw new ORPCError("UNAUTHORIZED", { message: "Not authenticated" });
      }
      const [found] = await db
        .select({ passwordHash: users.passwordHash })
        .from(users)
        .where(eq(users.id, context.user.id))
        .limit(1);
      if (!found) {
        throw new ORPCError("UNAUTHORIZED", { message: "Not authenticated" });
      }
      const valid = await verifyPassword(input.currentPassword, found.passwordHash);
      if (!valid) {
        throw new ORPCError("UNAUTHORIZED", { message: "Current password is incorrect" });
      }
      const newHash = await hashPassword(input.newPassword);
      await db
        .update(users)
        .set({ passwordHash: newHash, updatedAt: new Date() })
        .where(eq(users.id, context.user.id));
      return { success: true };
    }),

  deleteAccount: publicProcedure.handler(async ({ context }) => {
    if (!context.user) {
      throw new ORPCError("UNAUTHORIZED", { message: "Not authenticated" });
    }
    await db.delete(users).where(eq(users.id, context.user.id));
    return { success: true };
  }),
};
