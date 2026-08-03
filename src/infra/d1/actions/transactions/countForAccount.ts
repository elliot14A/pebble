import { and, count, eq, or, sql } from "drizzle-orm";
import type { AppResultAsync } from "@/core/error";
import { type DrizzleD1Database, read } from "@/infra/d1/connection";
import { transactions } from "@/infra/d1/schema";

export const countForAccount = (
  db: DrizzleD1Database,
  userId: string,
  accountId: string,
): AppResultAsync<number> =>
  read("account usage", () =>
    db
      .select({ total: count() })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          or(
            eq(transactions.accountId, accountId),
            eq(transactions.counterAccountId, accountId),
          ),
        ),
      ),
  ).map((rows) => rows[0]?.total ?? 0);

export const currenciesInUse = (
  db: DrizzleD1Database,
  userId: string,
): AppResultAsync<ReadonlyArray<string>> =>
  read("currencies in use", () =>
    db
      .selectDistinct({ currency: transactions.currency })
      .from(transactions)
      .where(and(eq(transactions.userId, userId), sql`1 = 1`)),
  ).map((rows) => rows.map((row) => row.currency));
