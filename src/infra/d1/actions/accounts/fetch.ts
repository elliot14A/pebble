import { and, eq } from "drizzle-orm";
import { errAsync, okAsync } from "neverthrow";
import type { Account } from "@/core/accounts/account";
import { type AppResultAsync, appError, ResourceErrorCode } from "@/core/error";
import { toAccount } from "@/infra/d1/actions/accounts/list";
import { type DrizzleD1Database, read } from "@/infra/d1/connection";
import { accounts } from "@/infra/d1/schema";

export const fetch = (
  db: DrizzleD1Database,
  userId: string,
  id: string,
): AppResultAsync<Account> =>
  read("account", () =>
    db
      .select()
      .from(accounts)
      .where(and(eq(accounts.userId, userId), eq(accounts.id, id)))
      .limit(1),
  ).andThen((rows) => {
    const row = rows[0];
    return row === undefined
      ? errAsync(
          appError(ResourceErrorCode.NOT_FOUND, `no account ${id}`, {
            meta: { id },
          }),
        )
      : okAsync(toAccount(row));
  });
