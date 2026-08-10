import { err, ok, ResultAsync } from "neverthrow";
import type { AppResult, AppResultAsync } from "@/core/error";
import { newId } from "@/core/id";
import { convert, type Rate, rateOn } from "@/core/rates";
import { nextAfter, type Recurring, runsDueBy } from "@/core/recurring";
import type { Transaction } from "@/core/transactions";
import { list as listRates } from "@/infra/d1/actions/rates";
import { advance, listDue } from "@/infra/d1/actions/recurring";
import { createMany } from "@/infra/d1/actions/transactions";
import type { DrizzleD1Database } from "@/infra/d1/connection";

export type RunReport = Readonly<{
  considered: number;
  logged: number;
  billsWaiting: number;
}>;

type Move = Readonly<{ id: string; nextOn: string; lastOn: string }>;

const baseFor = (
  rule: Recurring,
  baseCurrency: string,
  rates: ReadonlyArray<Rate> | null,
  on: string,
): number | null => {
  if (rule.currency === baseCurrency) return rule.amountMinor;
  if (rates === null) return null;

  const rate = rateOn(rates, rule.currency, on);
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

    const held = new Map<string, ReadonlyArray<Rate> | null>();
    const ratesFor = async (
      userId: string,
    ): Promise<ReadonlyArray<Rate> | null> => {
      const known = held.get(userId);
      if (known !== undefined) return known;

      const got = await listRates(db, userId);
      const rates = got.isOk() ? got.value : null;
      held.set(userId, rates);
      return rates;
    };

    const rows: Transaction[] = [];
    const moves: Move[] = [];
    let billsWaiting = 0;

    for (const rule of due.value) {
      if (rule.kind === "bill") {
        billsWaiting += 1;
        continue;
      }

      const dates = runsDueBy(rule, today);
      if (dates.length === 0) continue;

      const rates =
        rule.currency === baseCurrency ? null : await ratesFor(rule.userId);

      let cursor = rule.nextOn;

      for (const on of dates) {
        const base = baseFor(rule, baseCurrency, rates, on);

        rows.push({
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

        cursor = nextAfter(on, rule.every, rule.dayOfMonth);
      }

      moves.push({
        id: rule.id,
        nextOn: cursor,
        lastOn: dates[dates.length - 1] ?? today,
      });
    }

    const saved = rows.length === 0 ? ok(0) : await createMany(db, rows);
    if (saved.isErr()) return err(saved.error);

    for (const move of moves) {
      const moved = await advance(db, move.id, move.nextOn, move.lastOn);
      if (moved.isErr()) return err(moved.error);
    }

    return ok({
      considered: due.value.length,
      logged: saved.isOk() ? saved.value : 0,
      billsWaiting,
    });
  };

  return new ResultAsync(run());
};
