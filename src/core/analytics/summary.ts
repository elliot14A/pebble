import { baseSignedMinor, isLive, type Transaction } from "@/core/transactions";

export type Bucket = Readonly<{ key: string; minor: number }>;

export const monthOf = (date: string): string => date.slice(0, 7);

export const spendMinor = (transaction: Transaction): number => {
  const base = transaction.baseAmountMinor;
  if (base === null) return 0;
  if (transaction.type === "expense") return base;
  if (transaction.type === "refund") return -base;
  return 0;
};

const tally = (
  transactions: ReadonlyArray<Transaction>,
  keyOf: (transaction: Transaction) => string | null,
): ReadonlyArray<Bucket> => {
  const totals = new Map<string, number>();
  for (const transaction of transactions) {
    if (!isLive(transaction)) continue;
    const spend = spendMinor(transaction);
    if (spend === 0) continue;
    const key = keyOf(transaction);
    if (key === null) continue;
    totals.set(key, (totals.get(key) ?? 0) + spend);
  }

  return [...totals.entries()]
    .filter(([, minor]) => minor > 0)
    .map(([key, minor]) => ({ key, minor }))
    .sort((a, b) => b.minor - a.minor);
};

export const byCategory = (
  transactions: ReadonlyArray<Transaction>,
): ReadonlyArray<Bucket> => tally(transactions, (tx) => tx.categoryId ?? "");

export const byMerchant = (
  transactions: ReadonlyArray<Transaction>,
): ReadonlyArray<Bucket> =>
  tally(transactions, (tx) => (tx.note ?? "").trim() || null);

export type MonthFlow = Readonly<{
  month: string;
  inMinor: number;
  outMinor: number;
}>;

export const byMonth = (
  transactions: ReadonlyArray<Transaction>,
  months: ReadonlyArray<string>,
): ReadonlyArray<MonthFlow> => {
  const flows = new Map<string, { inMinor: number; outMinor: number }>(
    months.map((month) => [month, { inMinor: 0, outMinor: 0 }]),
  );

  for (const transaction of transactions) {
    if (!isLive(transaction)) continue;
    const flow = flows.get(monthOf(transaction.occurredOn));
    if (flow === undefined) continue;

    const signed = baseSignedMinor(transaction);
    if (signed >= 0) flow.inMinor += signed;
    else flow.outMinor -= signed;
  }

  return months.map((month) => ({
    month,
    inMinor: flows.get(month)?.inMinor ?? 0,
    outMinor: flows.get(month)?.outMinor ?? 0,
  }));
};

export const spendByMonth = (
  transactions: ReadonlyArray<Transaction>,
  months: ReadonlyArray<string>,
): ReadonlyArray<Bucket> => {
  const totals = new Map(months.map((month) => [month, 0]));

  for (const transaction of transactions) {
    if (!isLive(transaction)) continue;
    const month = monthOf(transaction.occurredOn);
    const running = totals.get(month);
    if (running === undefined) continue;
    totals.set(month, running + spendMinor(transaction));
  }

  return months.map((month) => ({
    key: month,
    minor: totals.get(month) ?? 0,
  }));
};

export const byWeekday = (
  transactions: ReadonlyArray<Transaction>,
): ReadonlyArray<number> => {
  const days = [0, 0, 0, 0, 0, 0, 0];
  for (const transaction of transactions) {
    if (!isLive(transaction)) continue;
    const spend = spendMinor(transaction);
    if (spend <= 0) continue;
    const weekday = new Date(`${transaction.occurredOn}T00:00:00Z`).getUTCDay();
    days[weekday] = (days[weekday] ?? 0) + spend;
  }
  return days;
};

export const topWithRest = (
  buckets: ReadonlyArray<Bucket>,
  count: number,
  restKey = "rest",
): ReadonlyArray<Bucket> => {
  if (buckets.length <= count) return buckets;

  const top = buckets.slice(0, count);
  const rest = buckets
    .slice(count)
    .reduce((total, bucket) => total + bucket.minor, 0);

  return rest > 0 ? [...top, { key: restKey, minor: rest }] : top;
};

export const totalOf = (buckets: ReadonlyArray<Bucket>): number =>
  buckets.reduce((total, bucket) => total + bucket.minor, 0);

export const monthsEnding = (
  month: string,
  count: number,
): ReadonlyArray<string> => {
  const year = Number(month.slice(0, 4));
  const index = Number(month.slice(5, 7));
  const months: string[] = [];

  for (let back = count - 1; back >= 0; back -= 1) {
    const shifted = new Date(Date.UTC(year, index - 1 - back, 1));
    months.push(shifted.toISOString().slice(0, 7));
  }
  return months;
};
