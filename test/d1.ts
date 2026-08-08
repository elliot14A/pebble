import { getPlatformProxy } from "wrangler";
import { connect, type DrizzleD1Database } from "@/infra/d1/connection";

/**
 * A real local D1, not a hand-written double. `getPlatformProxy` boots the same
 * miniflare D1 that `wrangler dev` uses, so every action is exercised against
 * actual SQLite with the actual driver. There is nothing to keep in sync.
 */
export type TestDatabase = Readonly<{
  db: DrizzleD1Database;
  binding: D1Database;
  bucket: R2Bucket;
  reset: () => Promise<void>;
  dispose: () => Promise<void>;
}>;

const TABLES = [
  "recurring",
  "category_prefs",
  "receipts",
  "budgets",
  "shares",
  "transactions",
  "fx_rates",
  "merchants",
  "categories",
  "accounts",
  "sessions",
  "users",
] as const;

// This file lives at test/, so the project root is one level up. Resolving
// from the module rather than the cwd keeps `bun test <path>` working anywhere.
const ROOT = `${import.meta.dir}/..`;

const statements = async (): Promise<ReadonlyArray<string>> => {
  const glob = new Bun.Glob("*.sql");
  const files = [...glob.scanSync({ cwd: `${ROOT}/migrations` })].sort();
  const out: string[] = [];

  for (const file of files) {
    const sql = await Bun.file(`${ROOT}/migrations/${file}`).text();
    out.push(
      ...sql
        .split("--> statement-breakpoint")
        .map((chunk) => chunk.trim())
        .filter((chunk) => chunk !== ""),
    );
  }

  return out;
};

export const openTestDatabase = async (): Promise<TestDatabase> => {
  const platform = await getPlatformProxy<{
    DB: D1Database;
    RECEIPTS: R2Bucket;
  }>({
    configPath: `${ROOT}/wrangler.test.jsonc`,
    persist: false,
  });
  const binding = platform.env.DB;

  for (const statement of await statements()) {
    await binding.prepare(statement).run();
  }

  return {
    db: connect(binding),
    binding,
    bucket: platform.env.RECEIPTS,
    reset: async () => {
      for (const table of TABLES) {
        await binding.prepare(`delete from ${table}`).run();
      }
    },
    dispose: () => platform.dispose(),
  };
};
