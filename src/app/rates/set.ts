import { err, ok, ResultAsync } from "neverthrow";
import {
  type AppResult,
  type AppResultAsync,
  appError,
  ValidationErrorCode,
} from "@/core/error";
import { isCurrency } from "@/core/money/currency";
import { parseRate, type Rate } from "@/core/rates/rate";
import { applyPending, save } from "@/infra/d1/actions/rates";
import type { DrizzleD1Database } from "@/infra/d1/connection";

export type SetRateInput = Readonly<{
  userId: string;
  currency: string;

  rateText: string;
  effectiveFrom?: string;
}>;

export type SetRateOptions = Readonly<{
  baseCurrency: string;
  now: number;
  today: string;
}>;

export type SetRateResult = Readonly<{
  rate: Rate;

  backfilled: number;
}>;

export const set = (
  db: DrizzleD1Database,
  input: SetRateInput,
  options: SetRateOptions,
): AppResultAsync<SetRateResult> => {
  const run = async (): Promise<AppResult<SetRateResult>> => {
    if (!isCurrency(input.currency)) {
      return err(
        appError(
          ValidationErrorCode.INVALID_INPUT,
          `unknown currency ${input.currency}`,
          { meta: { currency: input.currency } },
        ),
      );
    }
    if (input.currency === options.baseCurrency) {
      return err(
        appError(
          ValidationErrorCode.INVALID_INPUT,
          `${options.baseCurrency} is the base currency and is always 1`,
          { meta: { currency: input.currency } },
        ),
      );
    }

    const rateE8 = parseRate(input.rateText);
    if (rateE8.isErr()) return err(rateE8.error);

    const saved = await save(
      db,
      input.userId,
      {
        currency: input.currency,
        rateE8: rateE8.value,
        effectiveFrom: input.effectiveFrom ?? options.today,
      },
      options.now,
    );
    if (saved.isErr()) return err(saved.error);

    const backfilled = await applyPending(
      db,
      input.userId,
      input.currency,
      options.baseCurrency,
      options.now,
    );
    if (backfilled.isErr()) return err(backfilled.error);

    return ok({ rate: saved.value, backfilled: backfilled.value });
  };

  return new ResultAsync(run());
};
