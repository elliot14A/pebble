import { MONTHS_SHOWN } from "@/app/analytics";
import { type Change, change } from "@/core/analytics/compare";
import {
  type Bucket,
  byMerchant,
  monthOf,
  monthsEnding,
  spendByMonth,
  spendMinor,
} from "@/core/analytics/summary";
import type { AppResultAsync } from "@/core/error";
import { type DayGroup, groupByDay } from "@/core/transactions/balance";
import { list as listTransactions } from "@/infra/d1/actions/transactions";
import type { DrizzleD1Database } from "@/infra/d1/connection";

const TOP_MERCHANTS = 8;

export type CategoryBreakdown = Readonly<{
  categoryId: string;
  month: string;
  previousMonth: string;
  spentMinor: number;
  change: Change;
  averageMinor: number;
  merchants: ReadonlyArray<Bucket>;
  trend: ReadonlyArray<Bucket>;
  days: ReadonlyArray<DayGroup>;
  transactionCount: number;
}>;

export const categoryBreakdown = (
  db: DrizzleD1Database,
  userId: string,
  categoryId: string,
  month: string,
): AppResultAsync<CategoryBreakdown> => {
  const window = monthsEnding(month, MONTHS_SHOWN);
  const first = window[0] ?? month;
  const previousMonth = window[window.length - 2] ?? month;

  return listTransactions(db, {
    userId,
    categoryId,
    from: `${first}-01`,
    to: `${month}-31`,
  }).map((all) => {
    const thisMonth = all.filter((tx) => monthOf(tx.occurredOn) === month);
    const spent = thisMonth.reduce((total, tx) => total + spendMinor(tx), 0);
    const previous = all
      .filter((tx) => monthOf(tx.occurredOn) === previousMonth)
      .reduce((total, tx) => total + spendMinor(tx), 0);

    const trend = spendByMonth(all, window);
    // Only months that actually have history count, or a new category looks
    // cheaper than it is.
    const active = trend.filter((bucket) => bucket.minor !== 0);
    const average =
      active.length === 0
        ? 0
        : Math.round(
            active.reduce((total, bucket) => total + bucket.minor, 0) /
              active.length,
          );

    return {
      categoryId,
      month,
      previousMonth,
      spentMinor: spent,
      change: change(categoryId, spent, previous),
      averageMinor: average,
      merchants: byMerchant(thisMonth).slice(0, TOP_MERCHANTS),
      trend,
      days: groupByDay(thisMonth),
      transactionCount: thisMonth.length,
    };
  });
};
