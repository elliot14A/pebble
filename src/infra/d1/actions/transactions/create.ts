import { and, eq } from "drizzle-orm";
import { errAsync, okAsync } from "neverthrow";
import { type AppResultAsync, appError, ResourceErrorCode } from "@/core/error";
import type { Transaction } from "@/core/transactions";
import { toRow, toTransaction } from "@/infra/d1/actions/transactions/row";
import { type DrizzleD1Database, read, write } from "@/infra/d1/connection";
import { transactions } from "@/infra/d1/schema";

export const create = (
  db: DrizzleD1Database,
  transaction: Transaction,
): AppResultAsync<Transaction> =>
  write("transaction", () =>
    db
      .insert(transactions)
      .values(toRow(transaction))
      .onConflictDoNothing()
      .run(),
  )
    .andThen(() =>
      read("transaction", () =>
        db
          .select()
          .from(transactions)
          .where(
            and(
              eq(transactions.userId, transaction.userId),
              eq(transactions.clientId, transaction.clientId),
            ),
          )
          .limit(1),
      ),
    )
    .andThen((rows) => {
      const row = rows[0];
      return row === undefined
        ? errAsync(
            appError(
              ResourceErrorCode.CONFLICT,
              "transaction vanished after insert",
              { meta: { clientId: transaction.clientId } },
            ),
          )
        : okAsync(toTransaction(row));
    });
