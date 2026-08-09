import { and, eq } from "drizzle-orm";
import { errAsync, okAsync } from "neverthrow";
import { type AppResultAsync, appError, ResourceErrorCode } from "@/core/error";
import type { Transaction } from "@/core/transactions";
import { toRow } from "@/infra/d1/actions/transactions/row";
import { type DrizzleD1Database, write } from "@/infra/d1/connection";
import { transactions } from "@/infra/d1/schema";

export const update = (
  db: DrizzleD1Database,
  transaction: Transaction,
): AppResultAsync<Transaction> =>
  write("transaction", () =>
    db
      .update(transactions)
      .set(toRow(transaction))
      .where(
        and(
          eq(transactions.userId, transaction.userId),
          eq(transactions.id, transaction.id),
        ),
      )
      .run(),
  ).andThen((result) =>
    result.meta.changes === 0
      ? errAsync(
          appError(
            ResourceErrorCode.NOT_FOUND,
            `no transaction ${transaction.id}`,
            { meta: { id: transaction.id } },
          ),
        )
      : okAsync(transaction),
  );
