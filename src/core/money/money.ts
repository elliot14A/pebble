import { err } from "neverthrow";
import { type AppResult, appError, MoneyErrorCode } from "@/core/error";
import { type Currency, currencyOf } from "@/core/money/currency";

export type Money = Readonly<{
  minor: number;
  currency: string;
}>;

const MAX_MINOR = Number.MAX_SAFE_INTEGER;

export const money = (minor: number, currency: string): AppResult<Money> => {
  if (!Number.isSafeInteger(minor)) {
    return err(
      appError(
        MoneyErrorCode.INVALID_AMOUNT,
        "amount must be a whole number of minor units",
        { meta: { minor } },
      ),
    );
  }
  return currencyOf(currency).map(() => ({ minor, currency }));
};

const pow10 = (exponent: number): number => 10 ** exponent;

export const parseAmount = (
  input: string,
  currency: string,
): AppResult<Money> =>
  currencyOf(currency).andThen((meta) => {
    const trimmed = input.trim();
    if (!/^-?\d*(\.\d*)?$/.test(trimmed) || trimmed === "" || trimmed === "-") {
      return err(
        appError(MoneyErrorCode.INVALID_AMOUNT, `cannot read amount ${input}`, {
          meta: { input },
        }),
      );
    }

    const negative = trimmed.startsWith("-");
    const body = negative ? trimmed.slice(1) : trimmed;
    const [whole = "", fraction = ""] = body.split(".");

    if (fraction.length > meta.exponent) {
      return err(
        appError(
          MoneyErrorCode.INVALID_AMOUNT,
          `${currency} has ${meta.exponent} decimal places`,
          { meta: { input, exponent: meta.exponent } },
        ),
      );
    }

    const padded = fraction.padEnd(meta.exponent, "0");
    const minor = Number(`${whole === "" ? "0" : whole}${padded}`);
    if (minor > MAX_MINOR) {
      return err(
        appError(MoneyErrorCode.INVALID_AMOUNT, "amount is too large", {
          meta: { input },
        }),
      );
    }
    return money(negative ? -minor : minor, currency);
  });

const groupIndian = (digits: string): string => {
  if (digits.length <= 3) return digits;
  const last = digits.slice(-3);
  const rest = digits.slice(0, -3);
  return `${rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",")},${last}`;
};

const groupWestern = (digits: string): string =>
  digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

export type FormatOptions = Readonly<{
  decimals?: "auto" | "always" | "never";
  symbol?: boolean;
  sign?: "auto" | "never" | "always";
}>;

const formatWith = (
  meta: Currency,
  minor: number,
  options: FormatOptions,
): string => {
  const decimals = options.decimals ?? "auto";
  const showSymbol = options.symbol ?? true;
  const sign = options.sign ?? "auto";

  const negative = minor < 0;
  const absolute = Math.abs(minor);
  const unit = pow10(meta.exponent);
  const whole = Math.trunc(absolute / unit);
  const fraction = absolute % unit;

  const grouped =
    meta.grouping === "indian"
      ? groupIndian(String(whole))
      : groupWestern(String(whole));

  const showFraction =
    meta.exponent > 0 &&
    (decimals === "always" || (decimals === "auto" && fraction !== 0));

  const body = showFraction
    ? `${grouped}.${String(fraction).padStart(meta.exponent, "0")}`
    : grouped;

  const prefix = negative
    ? sign === "never"
      ? ""
      : "−"
    : sign === "always"
      ? "+"
      : "";

  return `${prefix}${showSymbol ? meta.symbol : ""}${body}`;
};

export const formatMoney = (
  amount: Money,
  options: FormatOptions = {},
): AppResult<string> =>
  currencyOf(amount.currency).map((meta) =>
    formatWith(meta, amount.minor, options),
  );

export const displayMoney = (
  amount: Money,
  options: FormatOptions = {},
): string =>
  formatMoney(amount, options).unwrapOr(`${amount.currency} ${amount.minor}`);

const SHORT_INDIAN = [
  { at: 10_000_000, suffix: "Cr" },
  { at: 100_000, suffix: "L" },
  { at: 1_000, suffix: "k" },
] as const;

const SHORT_WESTERN = [
  { at: 1_000_000_000, suffix: "B" },
  { at: 1_000_000, suffix: "M" },
  { at: 1_000, suffix: "k" },
] as const;

const trim = (value: number): string =>
  value >= 10 ? String(Math.round(value)) : String(Math.round(value * 10) / 10);

export const briefAmount = (minor: number, currency: string): string => {
  const found = currencyOf(currency);
  const exponent = found.isOk() ? found.value.exponent : 2;
  const grouping = found.isOk() ? found.value.grouping : "western";

  const major = Math.abs(minor) / 10 ** exponent;
  const sign = minor < 0 ? "-" : "";
  const scale = grouping === "indian" ? SHORT_INDIAN : SHORT_WESTERN;

  for (const step of scale) {
    if (major >= step.at) {
      return `${sign}${trim(major / step.at)}${step.suffix}`;
    }
  }

  return `${sign}${Math.round(major)}`;
};
