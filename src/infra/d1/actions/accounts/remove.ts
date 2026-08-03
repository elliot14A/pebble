import { and, eq } from "drizzle-orm";
import { errAsync, okAsync } from "neverthrow";
import { type AppResultAsync, appError, ResourceErrorCode } from "@/core/error";
import { type DrizzleD1Database, write } from "@/infra/d1/connection";
import { accounts } from "@/infra/d1/schema";

export const remove = (
  db: DrizzleD1Database,
  userId: string,
  id: string,
): AppResultAsync<void> =>
  write("account", () =>
    db
      .delete(accounts)
      .where(and(eq(accounts.userId, userId), eq(accounts.id, id)))
      .run(),
  ).andThen((result) =>
    result.meta.changes === 0
      ? errAsync(
          appError(ResourceErrorCode.NOT_FOUND, `no account ${id}`, {
            meta: { id },
          }),
        )
      : okAsync(undefined),
  );

export const archive = (
  db: DrizzleD1Database,
  userId: string,
  id: string,
  at: number,
): AppResultAsync<void> =>
  write("account", () =>
    db
      .update(accounts)
      .set({ archivedAt: at })
      .where(and(eq(accounts.userId, userId), eq(accounts.id, id)))
      .run(),
  ).andThen((result) =>
    result.meta.changes === 0
      ? errAsync(
          appError(ResourceErrorCode.NOT_FOUND, `no account ${id}`, {
            meta: { id },
          }),
        )
      : okAsync(undefined),
  );

export const restore = (
  db: DrizzleD1Database,
  userId: string,
  id: string,
): AppResultAsync<void> =>
  write("account", () =>
    db
      .update(accounts)
      .set({ archivedAt: null })
      .where(and(eq(accounts.userId, userId), eq(accounts.id, id)))
      .run(),
  ).map(() => undefined);
