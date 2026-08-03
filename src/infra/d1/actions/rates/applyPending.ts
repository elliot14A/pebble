import { and, eq, isNull } from "drizzle-orm";
import { err, ok, ResultAsync } from "neverthrow";
import type { AppResult, AppResultAsync } from "@/core/error";
import { convert, rateOn } from "@/core/rates/rate";
import { list as listRates } from "@/infra/d1/actions/rates/list";
import { type DrizzleD1Database, read, write } from "@/infra/d1/connection";
import { transactions } from "@/infra/d1/schema";

export const applyPending = (
  db: DrizzleD1Database,
  userId: string,
  currency: string,
  baseCurrency: string,
  now: number,
): AppResultAsync<number> => {
  const run = async (): Promise<AppResult<number>> => {
    const rates = await listRates(db, userId);
    if (rates.isErr()) return err(rates.error);

    const pending = await read("pending transactions", () =>
      db
        .select()
        .from(transactions)
        .where(
          and(
            eq(transactions.userId, userId),
            eq(transactions.currency, currency),
            eq(transactions.fxPending, true),
            isNull(transactions.deletedAt),
          ),
        ),
    );
    if (pending.isErr()) return err(pending.error);

    let filled = 0;
    for (const row of pending.value) {
      const rate = rateOn(rates.value, currency, row.occurredOn);
      if (rate === null) continue;

      const base = convert(
        { minor: row.amountMinor, currency: row.currency },
        baseCurrency,
        rate.rateE8,
      );
      if (base.isErr()) continue;

      const updated = await write("backfilled transaction", () =>
        db
          .update(transactions)
          .set({
            baseAmountMinor: base.value.minor,
            fxRateE8: rate.rateE8,
            fxPending: false,
            updatedAt: now,
          })
          .where(eq(transactions.id, row.id))
          .run(),
      );
      if (updated.isErr()) return err(updated.error);
      filled += 1;
    }

    return ok(filled);
  };

  return new ResultAsync(run());
};
