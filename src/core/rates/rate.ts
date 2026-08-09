import { err, ok } from "neverthrow";
import { type AppResult, appError, MoneyErrorCode } from "@/core/error";
import { currencyOf, type Money, money } from "@/core/money";

export const RATE_SCALE = 100_000_000;
const RATE_SCALE_BIG = 100_000_000n;
const RATE_DECIMALS = 8;

export type Rate = Readonly<{
  currency: string;

  rateE8: number;
  effectiveFrom: string;
}>;

export const parseRate = (input: string): AppResult<number> => {
  const trimmed = input.trim();
  if (!/^\d*(\.\d*)?$/.test(trimmed) || trimmed === "") {
    return err(
      appError(MoneyErrorCode.INVALID_AMOUNT, `cannot read rate ${input}`, {
        meta: { input },
      }),
    );
  }

  const [whole = "", fraction = ""] = trimmed.split(".");
  if (fraction.length > RATE_DECIMALS) {
    return err(
      appError(
        MoneyErrorCode.INVALID_AMOUNT,
        `a rate has at most ${RATE_DECIMALS} decimal places`,
        { meta: { input } },
      ),
    );
  }

  const rateE8 = Number(
    `${whole === "" ? "0" : whole}${fraction.padEnd(RATE_DECIMALS, "0")}`,
  );
  if (!Number.isSafeInteger(rateE8) || rateE8 <= 0) {
    return err(
      appError(MoneyErrorCode.INVALID_AMOUNT, "a rate must be above zero", {
        meta: { input },
      }),
    );
  }
  return ok(rateE8);
};

export const formatRate = (rateE8: number): string => {
  const whole = Math.trunc(rateE8 / RATE_SCALE);
  const fraction = String(rateE8 % RATE_SCALE)
    .padStart(RATE_DECIMALS, "0")
    .replace(/0+$/, "");
  return fraction === "" ? String(whole) : `${whole}.${fraction}`;
};

const pow10 = (exponent: number): bigint => 10n ** BigInt(exponent);

const divideRounded = (numerator: bigint, denominator: bigint): bigint => {
  const negative = numerator < 0n;
  const absolute = negative ? -numerator : numerator;
  const rounded = (2n * absolute + denominator) / (2n * denominator);
  return negative ? -rounded : rounded;
};

export const convert = (
  amount: Money,
  toCurrency: string,
  rateE8: number,
): AppResult<Money> => {
  if (amount.currency === toCurrency) return ok(amount);
  if (!Number.isSafeInteger(rateE8) || rateE8 <= 0) {
    return err(
      appError(
        MoneyErrorCode.MISSING_RATE,
        `no usable rate for ${amount.currency}`,
        {
          meta: { currency: amount.currency, rateE8 },
        },
      ),
    );
  }

  return currencyOf(amount.currency).andThen((from) =>
    currencyOf(toCurrency).andThen((to) => {
      const numerator =
        BigInt(amount.minor) * BigInt(rateE8) * pow10(to.exponent);
      const denominator = pow10(from.exponent) * RATE_SCALE_BIG;
      const minor = divideRounded(numerator, denominator);

      if (
        minor > BigInt(Number.MAX_SAFE_INTEGER) ||
        minor < -BigInt(Number.MAX_SAFE_INTEGER)
      ) {
        return err(
          appError(
            MoneyErrorCode.INVALID_AMOUNT,
            "converted amount is too large",
            {
              meta: { currency: amount.currency, toCurrency },
            },
          ),
        );
      }
      return money(Number(minor), toCurrency);
    }),
  );
};

export const rateOn = (
  rates: ReadonlyArray<Rate>,
  currency: string,
  onDate: string,
): Rate | null => {
  let best: Rate | null = null;
  for (const rate of rates) {
    if (rate.currency !== currency) continue;
    if (rate.effectiveFrom > onDate) continue;
    if (best === null || rate.effectiveFrom > best.effectiveFrom) best = rate;
  }
  return best;
};
