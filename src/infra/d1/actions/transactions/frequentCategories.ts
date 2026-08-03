import { and, count, desc, eq, isNotNull, isNull } from "drizzle-orm";
import type { AppResultAsync } from "@/core/error";
import { type DrizzleD1Database, read } from "@/infra/d1/connection";
import { transactions } from "@/infra/d1/schema";

export const frequentCategories = (
  db: DrizzleD1Database,
  userId: string,
  limit: number,
): AppResultAsync<ReadonlyArray<string>> =>
  read("category frequency", () =>
    db
      .select({ categoryId: transactions.categoryId, uses: count() })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          isNull(transactions.deletedAt),
          isNotNull(transactions.categoryId),
        ),
      )
      .groupBy(transactions.categoryId)
      .orderBy(desc(count()))
      .limit(limit),
  ).map((rows) =>
    rows.flatMap((row) => (row.categoryId === null ? [] : [row.categoryId])),
  );
