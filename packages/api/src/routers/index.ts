import type { RouterClient } from "@orpc/server";

import { publicProcedure } from "../index";
import { authRouter } from "./auth";
import { topicsRouter } from "./topics";
import { mapsRouter } from "./maps";
import { progressRouter } from "./progress";
import { chatRouter } from "./chat";
import { solveRouter } from "./solve";

export const appRouter = {
  healthCheck: publicProcedure.handler(() => "OK"),
  auth: authRouter,
  topics: topicsRouter,
  maps: mapsRouter,
  progress: progressRouter,
  chat: chatRouter,
  solve: solveRouter,
};

export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
