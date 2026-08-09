export const EVERY = ["week", "month", "year"] as const;
export type Every = (typeof EVERY)[number];

export const KINDS = ["transaction", "bill"] as const;
export type RecurringKind = (typeof KINDS)[number];

export type Recurring = Readonly<{
  id: string;
  userId: string;
  kind: RecurringKind;
  type: "expense" | "income";
  name: string;
  amountMinor: number;
  currency: string;
  accountId: string;
  categoryId: string | null;
  every: Every;
  dayOfMonth: number;
  nextOn: string;
  lastRunOn: string | null;
  createdAt: number;
  archivedAt: number | null;
}>;

const DAY_MS = 24 * 60 * 60 * 1000;

export const isEvery = (value: string): value is Every =>
  (EVERY as ReadonlyArray<string>).includes(value);

const daysIn = (year: number, month: number): number =>
  new Date(Date.UTC(year, month, 0)).getUTCDate();

const iso = (year: number, month: number, day: number): string =>
  `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(
    day,
  ).padStart(2, "0")}`;

export const onOrBefore = (
  year: number,
  month: number,
  wanted: number,
): string => iso(year, month, Math.min(wanted, daysIn(year, month)));

export const nextAfter = (
  date: string,
  every: Every,
  dayOfMonth: number,
): string => {
  const year = Number(date.slice(0, 4));
  const month = Number(date.slice(5, 7));

  if (every === "week") {
    return new Date(Date.parse(`${date}T00:00:00Z`) + 7 * DAY_MS)
      .toISOString()
      .slice(0, 10);
  }

  if (every === "year") return onOrBefore(year + 1, month, dayOfMonth);

  return month === 12
    ? onOrBefore(year + 1, 1, dayOfMonth)
    : onOrBefore(year, month + 1, dayOfMonth);
};

export const isDue = (recurring: Recurring, today: string): boolean =>
  recurring.archivedAt === null && recurring.nextOn <= today;

export const runsDueBy = (
  recurring: Recurring,
  today: string,
  limit = 60,
): ReadonlyArray<string> => {
  if (recurring.archivedAt !== null) return [];

  const due: string[] = [];
  let cursor = recurring.nextOn;

  while (cursor <= today && due.length < limit) {
    due.push(cursor);
    cursor = nextAfter(cursor, recurring.every, recurring.dayOfMonth);
  }

  return due;
};

export const daysUntil = (nextOn: string, today: string): number =>
  Math.round(
    (Date.parse(`${nextOn}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) /
      DAY_MS,
  );
