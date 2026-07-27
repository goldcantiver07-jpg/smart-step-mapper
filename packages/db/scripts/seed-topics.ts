import { readFileSync } from "fs";
import { resolve } from "path";

async function main() {
  // Load env from apps/web/.env before importing env-dependent modules
  // Must use sync read + manual env set because ESM imports are hoisted
  const envPath = resolve(import.meta.dir, "../../../apps/web/.env");
  const envContent = readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    if (key && !process.env[key]) process.env[key] = value;
  }
  process.env.SKIP_ENV_VALIDATION = "true";

  // Dynamic imports to avoid ESM hoisting (static imports execute before our env setup)
  const [{ createDb }, { topics }, { defaultTopics }] = await Promise.all([
    import("../src/index"),
    import("../src/schema/topics"),
    import("../src/seed"),
  ]);

  const db = createDb();
  const existing = await db.select().from(topics).limit(1);
  if (existing.length > 0) {
    console.log("Topics already seeded, skipping.");
    process.exit(0);
  }

  await db.insert(topics).values(defaultTopics);
  console.log(`Seeded ${defaultTopics.length} topics.`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
