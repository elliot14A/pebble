import { asc, desc, eq } from "drizzle-orm";
import type { AppResultAsync } from "@/core/error";
import type { Merchant } from "@/core/merchants";
import { type DrizzleD1Database, read } from "@/infra/d1/connection";
import { merchants } from "@/infra/d1/schema";

export type MerchantRow = typeof merchants.$inferSelect;

export const toMerchant = (row: MerchantRow): Merchant => ({
  id: row.id,
  userId: row.userId,
  normalizedName: row.normalizedName,
  displayName: row.displayName,
  defaultCategoryId: row.defaultCategoryId,
  seenCount: row.seenCount,
});

export const list = (
  db: DrizzleD1Database,
  userId: string,
  limit: number,
): AppResultAsync<ReadonlyArray<Merchant>> =>
  read("merchants", () =>
    db
      .select()
      .from(merchants)
      .where(eq(merchants.userId, userId))
      .orderBy(desc(merchants.seenCount), asc(merchants.displayName))
      .limit(limit),
  ).map((rows) => rows.map(toMerchant));
