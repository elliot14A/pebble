import { asc, eq } from "drizzle-orm";
import { type Account, isAccountKind } from "@/core/accounts";
import type { AppResultAsync } from "@/core/error";
import { type DrizzleD1Database, read } from "@/infra/d1/connection";
import { accounts } from "@/infra/d1/schema";

export type AccountRow = typeof accounts.$inferSelect;

export const toAccount = (row: AccountRow): Account => ({
  id: row.id,
  userId: row.userId,
  name: row.name,
  kind: isAccountKind(row.kind) ? row.kind : "wallet",
  currency: row.currency,
  openingBalanceMinor: row.openingBalanceMinor,
  sortOrder: row.sortOrder,
  archivedAt: row.archivedAt,
});

export const list = (
  db: DrizzleD1Database,
  userId: string,
): AppResultAsync<ReadonlyArray<Account>> =>
  read("accounts", () =>
    db
      .select()
      .from(accounts)
      .where(eq(accounts.userId, userId))
      .orderBy(asc(accounts.sortOrder), asc(accounts.id)),
  ).map((rows) => rows.map(toAccount));
