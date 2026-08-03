import { and, desc, eq, gte, isNull, like, lt, lte, sql } from "drizzle-orm";
import type { AppResultAsync } from "@/core/error";
import type {
  Transaction,
  TransactionType,
} from "@/core/transactions/transaction";
import { toTransaction } from "@/infra/d1/actions/transactions/row";
import { type DrizzleD1Database, read } from "@/infra/d1/connection";
import { transactions } from "@/infra/d1/schema";

export type TransactionQuery = Readonly<{
  userId: string;
  from?: string;
  to?: string;
  accountId?: string;
  categoryId?: string;
  walletId?: string;
  type?: TransactionType;
  search?: string;
  before?: string;
  limit?: number;
  offset?: number;
}>;

export const list = (
  db: DrizzleD1Database,
  query: TransactionQuery,
): AppResultAsync<ReadonlyArray<Transaction>> => {
  const where = [
    eq(transactions.userId, query.userId),
    isNull(transactions.deletedAt),
  ];
  if (query.from !== undefined) {
    where.push(gte(transactions.occurredOn, query.from));
  }
  if (query.to !== undefined) {
    where.push(lte(transactions.occurredOn, query.to));
  }
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
  if (query.type !== undefined) {
    where.push(eq(transactions.type, query.type));
  }
  if (query.search !== undefined && query.search !== "") {
    where.push(like(transactions.note, `%${query.search}%`));
  }
  if (query.before !== undefined) {
    where.push(lt(transactions.occurredOn, query.before));
  }

  const rows = db
    .select()
    .from(transactions)
    .where(and(...where))
    .orderBy(desc(transactions.occurredOn), desc(transactions.id));

  return read("transactions", () =>
    query.limit === undefined
      ? rows
      : rows.limit(query.limit).offset(query.offset ?? 0),
  ).map((mapped) => mapped.map(toTransaction));
};
