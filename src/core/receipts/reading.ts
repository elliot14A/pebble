export type Reading = Readonly<{
  amountText: string | null;
  merchant: string | null;
  occurredOn: string | null;
  currency: string | null;
}>;

export const NOTHING: Reading = {
  amountText: null,
  merchant: null,
  occurredOn: null,
  currency: null,
};

const EMPTY = new Set([
  "",
  "-",
  "n/a",
  "na",
  "none",
  "null",
  "unknown",
  "not visible",
  "not found",
  "unclear",
]);

const MAX_MERCHANT = 40;

const carve = (raw: string): unknown => {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end <= start) return null;

  try {
    return JSON.parse(raw.slice(start, end + 1));
  } catch {
    return null;
  }
};

const textOf = (value: unknown): string =>
  typeof value === "string"
    ? value.trim()
    : typeof value === "number"
      ? String(value)
      : "";

const blank = (value: string): boolean => EMPTY.has(value.toLowerCase());

export const readAmount = (value: unknown): string | null => {
  const text = textOf(value);
  if (blank(text)) return null;

  const digits = text.replace(/[^0-9.,]/g, "");
  if (digits === "") return null;

  const lastDot = digits.lastIndexOf(".");
  const lastComma = digits.lastIndexOf(",");
  const point = Math.max(lastDot, lastComma);

  const whole =
    point === -1 ? digits : digits.slice(0, point).replace(/[.,]/g, "");
  const fraction =
    point === -1 ? "" : digits.slice(point + 1).replace(/\D/g, "");

  const cleaned =
    fraction === "" || fraction.length > 2
      ? `${whole}${fraction}`
      : `${whole}.${fraction}`;

  const amount = Number(cleaned);
  if (!Number.isFinite(amount) || amount <= 0) return null;

  return cleaned.replace(/^0+(?=\d)/, "");
};

export const readMerchant = (value: unknown): string | null => {
  const text = textOf(value).replace(/\s+/g, " ");
  if (blank(text)) return null;

  const letters = text.replace(/[^\p{L}]/gu, "");
  if (letters.length < 2) return null;

  return text.slice(0, MAX_MERCHANT);
};

const isRealDate = (year: number, month: number, day: number): boolean => {
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const made = new Date(Date.UTC(year, month - 1, day));
  return (
    made.getUTCFullYear() === year &&
    made.getUTCMonth() === month - 1 &&
    made.getUTCDate() === day
  );
};

const iso = (year: number, month: number, day: number): string =>
  `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(
    day,
  ).padStart(2, "0")}`;

export const readDate = (value: unknown, today: string): string | null => {
  const text = textOf(value);
  if (blank(text)) return null;

  const ymd = text.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  const dmy = text.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/);

  let year = 0;
  let month = 0;
  let day = 0;

  if (ymd !== null) {
    year = Number(ymd[1]);
    month = Number(ymd[2]);
    day = Number(ymd[3]);
  } else if (dmy !== null) {
    day = Number(dmy[1]);
    month = Number(dmy[2]);
    year = Number(dmy[3]);
    if (year < 100) year += 2000;
  } else {
    return null;
  }

  if (!isRealDate(year, month, day)) return null;

  const made = iso(year, month, day);
  return made > today ? null : made;
};

export const readCurrency = (value: unknown): string | null => {
  const text = textOf(value).toUpperCase();
  return /^[A-Z]{3}$/.test(text) ? text : null;
};

export const readReceipt = (raw: string, today: string): Reading => {
  const parsed = carve(raw);
  if (parsed === null || typeof parsed !== "object") return NOTHING;

  const fields = parsed as Record<string, unknown>;

  return {
    amountText: readAmount(fields.total ?? fields.amount),
    merchant: readMerchant(fields.merchant ?? fields.name),
    occurredOn: readDate(fields.date ?? fields.occurredOn, today),
    currency: readCurrency(fields.currency),
  };
};
