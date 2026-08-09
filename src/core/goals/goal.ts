export type Goal = Readonly<{
  id: string;
  userId: string;
  name: string;
  targetMinor: number;
  savedMinor: number;
  currency: string;
  accountId: string | null;
  targetOn: string | null;
  createdAt: number;
  reachedAt: number | null;
  archivedAt: number | null;
}>;

export const MAX_NAME = 32;

const DAY_MS = 24 * 60 * 60 * 1000;

export const leftMinor = (goal: Goal): number =>
  Math.max(goal.targetMinor - goal.savedMinor, 0);

export const usedBps = (goal: Goal): number =>
  goal.targetMinor <= 0
    ? 0
    : Math.min(
        Math.round((goal.savedMinor / goal.targetMinor) * 10_000),
        10_000,
      );

export const isReached = (goal: Goal): boolean =>
  goal.savedMinor >= goal.targetMinor;

export const daysLeft = (goal: Goal, today: string): number | null =>
  goal.targetOn === null
    ? null
    : Math.round(
        (Date.parse(`${goal.targetOn}T00:00:00Z`) -
          Date.parse(`${today}T00:00:00Z`)) /
          DAY_MS,
      );

export const perMonthMinor = (goal: Goal, today: string): number | null => {
  const days = daysLeft(goal, today);
  if (days === null || isReached(goal)) return null;
  if (days <= 0) return leftMinor(goal);

  return Math.ceil(leftMinor(goal) / Math.max(days / 30, 1));
};
