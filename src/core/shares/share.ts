import { err, ok } from "neverthrow";
import { randomToken } from "@/core/bytes";
import { type AppResult, appError, ValidationErrorCode } from "@/core/error";

const TOKEN_BYTES = 24;
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_LABEL = 60;
const MAX_DAYS = 400;

export const SPANS = ["day", "week", "month", "range"] as const;
export type Span = (typeof SPANS)[number];

export type Share = Readonly<{
  id: string;
  userId: string;
  token: string;
  label: string;
  span: Span;
  fromDate: string;
  toDate: string;
  createdAt: number;
  expiresAt: number | null;
  revokedAt: number | null;
  viewCount: number;
  lastViewedAt: number | null;
}>;

export const isSpan = (value: string): value is Span =>
  (SPANS as ReadonlyArray<string>).includes(value);

export const newShareToken = (): string => randomToken(TOKEN_BYTES);

const isDate = (value: string): boolean =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  !Number.isNaN(Date.parse(`${value}T00:00:00Z`));

const shift = (isoDate: string, days: number): string =>
  new Date(Date.parse(`${isoDate}T00:00:00Z`) + days * DAY_MS)
    .toISOString()
    .slice(0, 10);

const startOfWeek = (isoDate: string): string => {
  const day = new Date(`${isoDate}T00:00:00Z`).getUTCDay();
  return shift(isoDate, -((day + 6) % 7));
};

const startOfMonth = (isoDate: string): string => `${isoDate.slice(0, 7)}-01`;

const endOfMonth = (isoDate: string): string => {
  const year = Number(isoDate.slice(0, 4));
  const month = Number(isoDate.slice(5, 7));
  return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
};

export type Window = Readonly<{ fromDate: string; toDate: string }>;

export const windowFor = (
  span: Span,
  today: string,
  from?: string,
  to?: string,
): AppResult<Window> => {
  if (span === "day") return ok({ fromDate: today, toDate: today });
  if (span === "week") {
    const start = startOfWeek(today);
    return ok({ fromDate: start, toDate: shift(start, 6) });
  }
  if (span === "month") {
    return ok({ fromDate: startOfMonth(today), toDate: endOfMonth(today) });
  }

  if (from === undefined || to === undefined || !isDate(from) || !isDate(to)) {
    return err(appError(ValidationErrorCode.INVALID_INPUT, "Pick both dates."));
  }
  if (from > to) {
    return err(
      appError(
        ValidationErrorCode.INVALID_INPUT,
        "The first date has to come before the second.",
      ),
    );
  }
  if (
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS >
    MAX_DAYS
  ) {
    return err(
      appError(
        ValidationErrorCode.INVALID_INPUT,
        `A share covers at most ${MAX_DAYS} days.`,
      ),
    );
  }

  return ok({ fromDate: from, toDate: to });
};

export const cleanLabel = (label: string): AppResult<string> => {
  const trimmed = label.trim().replace(/\s+/g, " ");
  if (trimmed.length > MAX_LABEL) {
    return err(
      appError(
        ValidationErrorCode.INVALID_INPUT,
        `Keep the name under ${MAX_LABEL} characters.`,
      ),
    );
  }
  return ok(trimmed);
};

export const expiryFor = (days: number, now: number): number | null =>
  days <= 0 ? null : now + days * DAY_MS;

export const isLive = (share: Share, now: number): boolean =>
  share.revokedAt === null &&
  (share.expiresAt === null || share.expiresAt > now);

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

export const formatDay = (isoDate: string): string => {
  const day = Number(isoDate.slice(8, 10));
  const month = MONTHS[Number(isoDate.slice(5, 7)) - 1] ?? "";
  return `${day} ${month} ${isoDate.slice(0, 4)}`;
};

export const formatRange = (from: string, to: string): string => {
  if (from === to) return formatDay(from);

  const sameYear = from.slice(0, 4) === to.slice(0, 4);
  const sameMonth = sameYear && from.slice(5, 7) === to.slice(5, 7);

  if (sameMonth) {
    return `${Number(from.slice(8, 10))} – ${formatDay(to)}`;
  }
  if (sameYear) {
    const month = MONTHS[Number(from.slice(5, 7)) - 1] ?? "";
    return `${Number(from.slice(8, 10))} ${month} – ${formatDay(to)}`;
  }
  return `${formatDay(from)} – ${formatDay(to)}`;
};

export const spanLabel = (share: Share): string =>
  formatRange(share.fromDate, share.toDate);
