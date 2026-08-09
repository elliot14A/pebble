import type { Account } from "@/core/accounts";
import type { AppResultAsync } from "@/core/error";
import { convert, type Rate, rateOn } from "@/core/rates";
import { accountBalanceMinor } from "@/core/transactions";
import { list as listAccounts } from "@/infra/d1/actions/accounts";
import { list as listRates } from "@/infra/d1/actions/rates";
import { list as listTransactions } from "@/infra/d1/actions/transactions";
import type { DrizzleD1Database } from "@/infra/d1/connection";

export type AccountBalance = Readonly<{
  account: Account;
  balanceMinor: number;

  baseMinor: number | null;
}>;

export const balances = (
  db: DrizzleD1Database,
  userId: string,
  baseCurrency: string,
  today: string,
): AppResultAsync<ReadonlyArray<AccountBalance>> =>
  listAccounts(db, userId).andThen((accounts) =>
    listRates(db, userId).andThen((rates) =>
      listTransactions(db, { userId }).map((transactions) =>
        accounts.map((account) => {
          const balanceMinor = accountBalanceMinor(
            account.openingBalanceMinor,
            transactions,
            account.id,
          );
          return {
            account,
            balanceMinor,
            baseMinor: inBase(
              balanceMinor,
              account.currency,
              rates,
              baseCurrency,
              today,
            ),
          };
        }),
      ),
    ),
  );

const inBase = (
  minor: number,
  currency: string,
  rates: ReadonlyArray<Rate>,
  baseCurrency: string,
  today: string,
): number | null => {
  if (currency === baseCurrency) return minor;
  const rate = rateOn(rates, currency, today);
  if (rate === null) return null;
  const converted = convert({ minor, currency }, baseCurrency, rate.rateE8);
  return converted.isErr() ? null : converted.value.minor;
};
