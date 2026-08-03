import { and, eq } from "drizzle-orm";
import { errAsync, okAsync } from "neverthrow";
import { type AppResultAsync, appError, ResourceErrorCode } from "@/core/error";
import { type DrizzleD1Database, write } from "@/infra/d1/connection";
import { transactions } from "@/infra/d1/schema";

export const remove = (
  db: DrizzleD1Database,
  userId: string,
  id: string,
  at: number,
): AppResultAsync<void> =>
  write("transaction", () =>
    db
      .update(transactions)
      .set({ deletedAt: at, updatedAt: at })
      .where(and(eq(transactions.userId, userId), eq(transactions.id, id)))
      .run(),
  ).andThen((result) =>
    result.meta.changes === 0
      ? errAsync(
          appError(ResourceErrorCode.NOT_FOUND, `no transaction ${id}`, {
            meta: { id },
          }),
        )
      : okAsync(undefined),
  );

export const restore = (
  db: DrizzleD1Database,
  userId: string,
  id: string,
  at: number,
): AppResultAsync<void> =>
  write("transaction", () =>
    db
      .update(transactions)
      .set({ deletedAt: null, updatedAt: at })
      .where(and(eq(transactions.userId, userId), eq(transactions.id, id)))
      .run(),
  ).andThen((result) =>
    result.meta.changes === 0
      ? errAsync(
          appError(ResourceErrorCode.NOT_FOUND, `no transaction ${id}`, {
            meta: { id },
          }),
        )
      : okAsync(undefined),
  );
