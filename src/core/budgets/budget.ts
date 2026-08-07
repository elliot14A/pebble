export const OVERALL = "__overall__";

export type Budget = Readonly<{
  id: string;
  userId: string;
  categoryId: string | null;
  limitMinor: number;
  createdAt: number;
  archivedAt: number | null;
}>;

export type BudgetState = "ok" | "close" | "over";

export type Progress = Readonly<{
  limitMinor: number;
  spentMinor: number;
  leftMinor: number;
  usedBps: number;
  state: BudgetState;
}>;

const CLOSE_BPS = 8000;

export const usedBps = (spentMinor: number, limitMinor: number): number =>
  limitMinor <= 0 ? 0 : Math.round((spentMinor / limitMinor) * 10_000);

export const stateOf = (bps: number): BudgetState =>
  bps > 10_000 ? "over" : bps >= CLOSE_BPS ? "close" : "ok";

export const progress = (limitMinor: number, spentMinor: number): Progress => {
  const bps = usedBps(spentMinor, limitMinor);
  return {
    limitMinor,
    spentMinor,
    leftMinor: limitMinor - spentMinor,
    usedBps: bps,
    state: stateOf(bps),
  };
};

export const daysInMonth = (month: string): number =>
  new Date(
    Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0),
  ).getUTCDate();

export const dayOfMonth = (isoDate: string): number =>
  Number(isoDate.slice(8, 10));

export const elapsedBps = (month: string, today: string): number => {
  const total = daysInMonth(month);
  if (today.slice(0, 7) < month) return 0;
  if (today.slice(0, 7) > month) return 10_000;
  return Math.round((dayOfMonth(today) / total) * 10_000);
};

export const projectedMinor = (
  spentMinor: number,
  month: string,
  today: string,
): number => {
  if (today.slice(0, 7) !== month) return spentMinor;
  const day = dayOfMonth(today);
  if (day <= 0) return spentMinor;
  return Math.round((spentMinor / day) * daysInMonth(month));
};

export const dailyLeftMinor = (
  leftMinor: number,
  month: string,
  today: string,
): number | null => {
  if (today.slice(0, 7) !== month) return null;
  const remaining = daysInMonth(month) - dayOfMonth(today) + 1;
  if (remaining <= 0) return null;
  return Math.floor(Math.max(leftMinor, 0) / remaining);
};

export const isOnPace = (
  usedBpsValue: number,
  month: string,
  today: string,
): boolean => usedBpsValue <= elapsedBps(month, today);
