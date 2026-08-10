import { getTableColumns } from "drizzle-orm";
import type { AppResultAsync } from "@/core/error";
import type { Transaction } from "@/core/transactions";
import { toRow } from "@/infra/d1/actions/transactions/row";
import { type DrizzleD1Database, write } from "@/infra/d1/connection";
import { transactions } from "@/infra/d1/schema";

const BOUND_LIMIT = 90;

const PER_STATEMENT = Math.max(
  1,
  Math.floor(BOUND_LIMIT / Object.keys(getTableColumns(transactions)).length),
);

export const createMany = (
  db: DrizzleD1Database,
  rows: ReadonlyArray<Transaction>,
): AppResultAsync<number> =>
  write("transactions", async () => {
    let added = 0;

    for (let at = 0; at < rows.length; at += PER_STATEMENT) {
      const done = await db
        .insert(transactions)
        .values(rows.slice(at, at + PER_STATEMENT).map(toRow))
        .onConflictDoNothing()
        .run();
      added += done.meta.changes;
    }

    return added;
  });
