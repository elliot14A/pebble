import {
  baseSignedMinor,
  isLive,
  signedMinor,
  type Transaction,
} from "@/core/transactions/transaction";

export const accountBalanceMinor = (
  openingMinor: number,
  transactions: ReadonlyArray<Transaction>,
  accountId: string,
): number =>
  transactions
    .filter(isLive)
    .reduce((total, tx) => total + signedMinor(tx, accountId), openingMinor);

export const netWorthMinor = (
  openingMinor: number,
  transactions: ReadonlyArray<Transaction>,
): number =>
  transactions
    .filter(isLive)
    .reduce((total, tx) => total + baseSignedMinor(tx), openingMinor);

export type Flow = Readonly<{ inMinor: number; outMinor: number }>;

/**
 * A refund reduces what you spent rather than counting as money earned. Both
 * readings leave savings identical, but only this one makes "out this month"
 * agree with the category totals underneath it.
 */
export const flowMinor = (transactions: ReadonlyArray<Transaction>): Flow =>
  transactions.filter(isLive).reduce<Flow>(
    (flow, tx) => {
      const signed = baseSignedMinor(tx);
      if (tx.type === "refund") {
        return { inMinor: flow.inMinor, outMinor: flow.outMinor - signed };
      }
      return signed >= 0
        ? { inMinor: flow.inMinor + signed, outMinor: flow.outMinor }
        : { inMinor: flow.inMinor, outMinor: flow.outMinor - signed };
    },
    { inMinor: 0, outMinor: 0 },
  );

export type DayGroup = Readonly<{
  date: string;
  netMinor: number;
  transactions: ReadonlyArray<Transaction>;
}>;

export const groupByDay = (
  transactions: ReadonlyArray<Transaction>,
): ReadonlyArray<DayGroup> => {
  const days = new Map<string, Transaction[]>();
  for (const tx of transactions) {
    if (!isLive(tx)) continue;
    const bucket = days.get(tx.occurredOn);
    if (bucket === undefined) days.set(tx.occurredOn, [tx]);
    else bucket.push(tx);
  }

  return [...days.entries()]
    .sort(([a], [b]) => (a < b ? 1 : a > b ? -1 : 0))
    .map(([date, rows]) => ({
      date,
      netMinor: rows.reduce((total, tx) => total + baseSignedMinor(tx), 0),
      transactions: [...rows].sort((a, b) =>
        a.id < b.id ? 1 : a.id > b.id ? -1 : 0,
      ),
    }));
};
