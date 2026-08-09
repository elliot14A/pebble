import { monthOf } from "@/core/analytics";

const NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

export const shiftMonth = (month: string, by: number): string => {
  const year = Number(month.slice(0, 4));
  const index = Number(month.slice(5, 7));
  return new Date(Date.UTC(year, index - 1 + by, 1)).toISOString().slice(0, 7);
};

export const monthLabel = (month: string, thisMonth: string): string => {
  const name = NAMES[Number(month.slice(5, 7)) - 1] ?? month;
  if (month === thisMonth) return "This month";
  if (month === shiftMonth(thisMonth, -1)) return "Last month";
  return month.slice(0, 4) === thisMonth.slice(0, 4)
    ? name
    : `${name} ${month.slice(0, 4)}`;
};

/** Never lets a hand-typed month run past the present or arrive malformed. */
export const resolveMonth = (
  asked: string | undefined,
  today: string,
): Readonly<{ month: string; thisMonth: string }> => {
  const thisMonth = monthOf(today);
  const wanted = asked ?? "";
  const valid = /^\d{4}-\d{2}$/.test(wanted) && wanted <= thisMonth;
  return { month: valid ? wanted : thisMonth, thisMonth };
};
