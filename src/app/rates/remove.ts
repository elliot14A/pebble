import { err, ok, ResultAsync } from "neverthrow";
import {
  type AppResult,
  type AppResultAsync,
  appError,
  ValidationErrorCode,
} from "@/core/error";
import { list as listAccounts } from "@/infra/d1/actions/accounts";
import { remove as dropRates } from "@/infra/d1/actions/rates";
import type { DrizzleD1Database } from "@/infra/d1/connection";

export const remove = (
  db: DrizzleD1Database,
  userId: string,
  currency: string,
): AppResultAsync<void> => {
  const run = async (): Promise<AppResult<void>> => {
    const accounts = await listAccounts(db, userId);
    if (accounts.isErr()) return err(accounts.error);

    const holders = accounts.value.filter(
      (account) => account.currency === currency,
    );
    if (holders.length > 0) {
      return err(
        appError(
          ValidationErrorCode.INVALID_INPUT,
          `${holders[0]?.name} is held in ${currency}. Change or delete that account first.`,
          { meta: { currency } },
        ),
      );
    }

    const dropped = await dropRates(db, userId, currency);
    return dropped.isErr() ? err(dropped.error) : ok(undefined);
  };

  return new ResultAsync(run());
};
