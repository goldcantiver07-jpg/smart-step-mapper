import { neon } from "@neondatabase/serverless";
import { env } from "@smart-step-mapper/env/server";
import { drizzle } from "drizzle-orm/neon-http";

import * as schema from "./schema";

export function createDb() {
  const sql = neon(env.DATABASE_URL);
  return drizzle(sql, { schema });
}

export const db = createDb();
