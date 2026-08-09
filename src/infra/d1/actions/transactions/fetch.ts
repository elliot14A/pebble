import { and, eq } from "drizzle-orm";
import { errAsync, okAsync } from "neverthrow";
import { type AppResultAsync, appError, ResourceErrorCode } from "@/core/error";
import type { Transaction } from "@/core/transactions";
import { toTransaction } from "@/infra/d1/actions/transactions/row";
import { type DrizzleD1Database, read } from "@/infra/d1/connection";
import { transactions } from "@/infra/d1/schema";

export const fetch = (
  db: DrizzleD1Database,
  userId: string,
  id: string,
): AppResultAsync<Transaction> =>
  read("transaction", () =>
    db
      .select()
      .from(transactions)
      .where(and(eq(transactions.userId, userId), eq(transactions.id, id)))
      .limit(1),
  ).andThen((rows) => {
    const row = rows[0];
    return row === undefined
      ? errAsync(
          appError(ResourceErrorCode.NOT_FOUND, `no transaction ${id}`, {
            meta: { id },
          }),
        )
      : okAsync(toTransaction(row));
  });
