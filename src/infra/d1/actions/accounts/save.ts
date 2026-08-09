import type { Account } from "@/core/accounts";
import type { AppResultAsync } from "@/core/error";
import { type DrizzleD1Database, write } from "@/infra/d1/connection";
import { accounts } from "@/infra/d1/schema";

export const save = (
  db: DrizzleD1Database,
  account: Account,
): AppResultAsync<Account> =>
  write("account", () =>
    db
      .insert(accounts)
      .values(account)
      .onConflictDoUpdate({ target: accounts.id, set: account })
      .run(),
  ).map(() => account);
