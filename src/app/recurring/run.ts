import { err, ok, ResultAsync } from "neverthrow";
import type { AppResult, AppResultAsync } from "@/core/error";
import { newId } from "@/core/id";
import { convert, rateOn } from "@/core/rates";
import { nextAfter, type Recurring, runsDueBy } from "@/core/recurring";
import { list as listRates } from "@/infra/d1/actions/rates";
import { advance, listDue } from "@/infra/d1/actions/recurring";
import { create } from "@/infra/d1/actions/transactions";
import type { DrizzleD1Database } from "@/infra/d1/connection";

export type RunReport = Readonly<{
  considered: number;
  logged: number;
  billsWaiting: number;
}>;

const baseFor = async (
  db: DrizzleD1Database,
  rule: Recurring,
  baseCurrency: string,
  on: string,
): Promise<number | null> => {
  if (rule.currency === baseCurrency) return rule.amountMinor;

  const rates = await listRates(db, rule.userId);
  if (rates.isErr()) return null;

  const rate = rateOn(rates.value, rule.currency, on);
  if (rate === null) return null;

  const converted = convert(
    { minor: rule.amountMinor, currency: rule.currency },
    baseCurrency,
    rate.rateE8,
  );
  return converted.isOk() ? converted.value.minor : null;
};

export const runDue = (
  db: DrizzleD1Database,
  baseCurrency: string,
  today: string,
  now: number,
): AppResultAsync<RunReport> => {
  const run = async (): Promise<AppResult<RunReport>> => {
    const due = await listDue(db, today);
    if (due.isErr()) return err(due.error);

    let logged = 0;
    let billsWaiting = 0;

    for (const rule of due.value) {
      if (rule.kind === "bill") {
        billsWaiting += 1;
        continue;
      }

      const dates = runsDueBy(rule, today);
      if (dates.length === 0) continue;

      let cursor = rule.nextOn;

      for (const on of dates) {
        const base = await baseFor(db, rule, baseCurrency, on);

        const made = await create(db, {
          id: newId(now),
          userId: rule.userId,
          accountId: rule.accountId,
          counterAccountId: null,
          categoryId: rule.categoryId,
          merchantId: null,
          walletId: null,
          type: rule.type,
          amountMinor: rule.amountMinor,
          currency: rule.currency,
          baseAmountMinor: base,
          fxRateE8: null,
          fxPending: base === null,
          occurredOn: on,
          note: rule.name,
          tags: null,
          clientId: `recurring:${rule.id}:${on}`,
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
        });

        if (made.isOk()) logged += 1;
        cursor = nextAfter(on, rule.every, rule.dayOfMonth);
      }

      const moved = await advance(
        db,
        rule.id,
        cursor,
        dates[dates.length - 1] ?? today,
      );
      if (moved.isErr()) return err(moved.error);
    }

    return ok({ considered: due.value.length, logged, billsWaiting });
  };

  return new ResultAsync(run());
};
