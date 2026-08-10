import { and, eq, isNull, like, sql } from "drizzle-orm";
import type { AppResultAsync } from "@/core/error";
import { type DrizzleD1Database, read, write } from "@/infra/d1/connection";
import { transactions } from "@/infra/d1/schema";

export type ImportBatch = Readonly<{
  accountId: string;
  broughtAt: number;
  count: number;
  fromDate: string;
  toDate: string;
}>;

const mine = (userId: string) =>
  and(
    eq(transactions.userId, userId),
    isNull(transactions.deletedAt),
    like(transactions.clientId, "import:%"),
  );

export const batches = (
  db: DrizzleD1Database,
  userId: string,
): AppResultAsync<ReadonlyArray<ImportBatch>> =>
  read("imports", () =>
    db
      .select({
        accountId: transactions.accountId,
        broughtAt: transactions.createdAt,
        count: sql<number>`count(*)`,
        fromDate: sql<string>`min(${transactions.occurredOn})`,
        toDate: sql<string>`max(${transactions.occurredOn})`,
      })
      .from(transactions)
      .where(mine(userId))
      .groupBy(transactions.accountId, transactions.createdAt)
      .orderBy(sql`${transactions.createdAt} desc`),
  );

export const removeBatch = (
  db: DrizzleD1Database,
  userId: string,
  accountId: string,
  broughtAt: number,
): AppResultAsync<number> =>
  write("imports", () =>
    db
      .delete(transactions)
      .where(
        and(
          mine(userId),
          eq(transactions.accountId, accountId),
          eq(transactions.createdAt, broughtAt),
        ),
      )
      .run(),
  ).map((done) => done.meta.changes);
