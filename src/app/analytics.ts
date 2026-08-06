import { type Change, change, compareBuckets } from "@/core/analytics/compare";
import {
  type Bucket,
  byCategory,
  byMerchant,
  byMonth,
  byWeekday,
  type MonthFlow,
  monthOf,
  monthsEnding,
  topWithRest,
  totalOf,
} from "@/core/analytics/summary";
import type { AppResultAsync } from "@/core/error";
import { flowMinor } from "@/core/transactions/balance";
import { list as listTransactions } from "@/infra/d1/actions/transactions";
import type { DrizzleD1Database } from "@/infra/d1/connection";

export const MONTHS_SHOWN = 6;
const TOP_CATEGORIES = 5;
const TOP_MERCHANTS = 5;

export const REST_KEY = "__rest__";

export type Analytics = Readonly<{
  month: string;
  inMinor: number;
  outMinor: number;
  savedMinor: number;
  categories: ReadonlyArray<Bucket>;
  categoryTotal: number;
  merchants: ReadonlyArray<Bucket>;
  months: ReadonlyArray<MonthFlow>;
  weekdays: ReadonlyArray<number>;
  transactionCount: number;

  previousMonth: string;
  inChange: Change;
  outChange: Change;
  savedChange: Change;
  movers: ReadonlyArray<Change>;
}>;

const MOVERS = 5;

export const analytics = (
  db: DrizzleD1Database,
  userId: string,
  month: string,
): AppResultAsync<Analytics> => {
  const window = monthsEnding(month, MONTHS_SHOWN);
  const first = window[0] ?? month;

  return listTransactions(db, {
    userId,
    from: `${first}-01`,
    to: `${month}-31`,
  }).map((all) => {
    const previousMonth = window[window.length - 2] ?? month;
    const thisMonth = all.filter((tx) => monthOf(tx.occurredOn) === month);
    const lastMonth = all.filter(
      (tx) => monthOf(tx.occurredOn) === previousMonth,
    );

    const flow = flowMinor(thisMonth);
    const lastFlow = flowMinor(lastMonth);
    const categories = topWithRest(
      byCategory(thisMonth),
      TOP_CATEGORIES,
      REST_KEY,
    );

    return {
      month,
      inMinor: flow.inMinor,
      outMinor: flow.outMinor,
      savedMinor: flow.inMinor - flow.outMinor,
      categories,
      categoryTotal: totalOf(categories),
      merchants: byMerchant(thisMonth).slice(0, TOP_MERCHANTS),
      months: byMonth(all, window),
      weekdays: byWeekday(thisMonth),
      transactionCount: thisMonth.length,

      previousMonth,
      inChange: change("in", flow.inMinor, lastFlow.inMinor),
      outChange: change("out", flow.outMinor, lastFlow.outMinor),
      savedChange: change(
        "saved",
        flow.inMinor - flow.outMinor,
        lastFlow.inMinor - lastFlow.outMinor,
      ),
      movers: compareBuckets(
        byCategory(thisMonth),
        byCategory(lastMonth),
      ).slice(0, MOVERS),
    };
  });
};
