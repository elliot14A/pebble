import { err, ok } from "neverthrow";
import { type AppResult, appError, MoneyErrorCode } from "@/core/error";

export type Currency = Readonly<{
  code: string;
  symbol: string;
  name: string;
  exponent: number;
  grouping: "indian" | "western";
}>;

const table = (
  list: ReadonlyArray<Currency>,
): Readonly<Record<string, Currency>> =>
  Object.freeze(Object.fromEntries(list.map((c) => [c.code, c])));

export const CURRENCIES = table([
  {
    code: "INR",
    symbol: "₹",
    name: "Indian Rupee",
    exponent: 2,
    grouping: "indian",
  },
  {
    code: "USD",
    symbol: "$",
    name: "US Dollar",
    exponent: 2,
    grouping: "western",
  },
  { code: "EUR", symbol: "€", name: "Euro", exponent: 2, grouping: "western" },
  {
    code: "GBP",
    symbol: "£",
    name: "Pound Sterling",
    exponent: 2,
    grouping: "western",
  },
  {
    code: "JPY",
    symbol: "¥",
    name: "Japanese Yen",
    exponent: 0,
    grouping: "western",
  },
  {
    code: "AED",
    symbol: "د.إ",
    name: "UAE Dirham",
    exponent: 2,
    grouping: "western",
  },
  {
    code: "SGD",
    symbol: "S$",
    name: "Singapore Dollar",
    exponent: 2,
    grouping: "western",
  },
  {
    code: "AUD",
    symbol: "A$",
    name: "Australian Dollar",
    exponent: 2,
    grouping: "western",
  },
  {
    code: "CAD",
    symbol: "C$",
    name: "Canadian Dollar",
    exponent: 2,
    grouping: "western",
  },
  {
    code: "CHF",
    symbol: "Fr",
    name: "Swiss Franc",
    exponent: 2,
    grouping: "western",
  },
  {
    code: "THB",
    symbol: "฿",
    name: "Thai Baht",
    exponent: 2,
    grouping: "western",
  },
  {
    code: "MYR",
    symbol: "RM",
    name: "Malaysian Ringgit",
    exponent: 2,
    grouping: "western",
  },
  {
    code: "LKR",
    symbol: "Rs",
    name: "Sri Lankan Rupee",
    exponent: 2,
    grouping: "indian",
  },
  {
    code: "NPR",
    symbol: "Rs",
    name: "Nepalese Rupee",
    exponent: 2,
    grouping: "indian",
  },
]);

export const BASE_CURRENCY = "INR";

export const currencyOf = (code: string): AppResult<Currency> => {
  const found = CURRENCIES[code];
  return found === undefined
    ? err(
        appError(MoneyErrorCode.UNKNOWN_CURRENCY, `unknown currency ${code}`, {
          meta: { code },
        }),
      )
    : ok(found);
};

export const isCurrency = (code: string): boolean =>
  CURRENCIES[code] !== undefined;

export const currencyList = (): ReadonlyArray<Currency> =>
  Object.values(CURRENCIES);
