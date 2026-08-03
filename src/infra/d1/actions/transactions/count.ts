import {
  and,
  eq,
  gte,
  isNull,
  like,
  lt,
  lte,
  count as rows,
  sql,
} from "drizzle-orm";
import type { AppResultAsync } from "@/core/error";
import type { TransactionQuery } from "@/infra/d1/actions/transactions/list";
import { type DrizzleD1Database, read } from "@/infra/d1/connection";
import { transactions } from "@/infra/d1/schema";

/**
 * Counts in SQL rather than by loading rows, so the ledger total is right no
 * matter how many pages are on screen.
 */
export const count = (
  db: DrizzleD1Database,
  query: TransactionQuery,
): AppResultAsync<number> => {
  const where = [
    eq(transactions.userId, query.userId),
    isNull(transactions.deletedAt),
  ];
  if (query.from !== undefined) {
    where.push(gte(transactions.occurredOn, query.from));
  }
  if (query.to !== undefined)
    where.push(lte(transactions.occurredOn, query.to));
  if (query.accountId !== undefined) {
    where.push(
      sql`(${transactions.accountId} = ${query.accountId} or ${transactions.counterAccountId} = ${query.accountId})`,
    );
  }
  if (query.categoryId !== undefined) {
    where.push(eq(transactions.categoryId, query.categoryId));
  }
  if (query.walletId !== undefined) {
    where.push(eq(transactions.walletId, query.walletId));
  }
  if (query.type !== undefined) where.push(eq(transactions.type, query.type));
  if (query.search !== undefined && query.search !== "") {
    where.push(like(transactions.note, `%${query.search}%`));
  }
  if (query.before !== undefined) {
    where.push(lt(transactions.occurredOn, query.before));
  }

  return read("transaction count", () =>
    db
      .select({ total: rows() })
      .from(transactions)
      .where(and(...where)),
  ).map((result) => result[0]?.total ?? 0);
};
