import { publicProcedure } from "../index";
import { db } from "@smart-step-mapper/db";
import { topics } from "@smart-step-mapper/db/schema";
import { asc } from "drizzle-orm";

export const topicsRouter = {
  list: publicProcedure.handler(async () => {
    return db.select().from(topics).orderBy(asc(topics.displayOrder));
  }),
};
