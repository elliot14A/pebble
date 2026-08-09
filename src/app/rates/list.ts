import type { AppResultAsync } from "@/core/error";
import type { Rate } from "@/core/rates";
import { list as listAccounts } from "@/infra/d1/actions/accounts";
import { list as listRates } from "@/infra/d1/actions/rates";
import { list as listTransactions } from "@/infra/d1/actions/transactions";
import type { DrizzleD1Database } from "@/infra/d1/connection";

export type CurrencyInUse = Readonly<{
  currency: string;

  rate: Rate | null;
  accountsUsing: number;
  pendingTransactions: number;
}>;

export const listInUse = (
  db: DrizzleD1Database,
  userId: string,
  baseCurrency: string,
): AppResultAsync<ReadonlyArray<CurrencyInUse>> =>
  listRates(db, userId).andThen((rates) =>
    listAccounts(db, userId).andThen((accounts) =>
      listTransactions(db, { userId }).map((all) => {
        const newest = new Map<string, Rate>();
        for (const rate of rates) {
          const held = newest.get(rate.currency);
          if (held === undefined || rate.effectiveFrom > held.effectiveFrom) {
            newest.set(rate.currency, rate);
          }
        }

        const codes = new Set<string>(newest.keys());
        for (const account of accounts) {
          if (account.currency !== baseCurrency) codes.add(account.currency);
        }

        return [...codes].sort().map((currency) => ({
          currency,
          rate: newest.get(currency) ?? null,
          accountsUsing: accounts.filter((a) => a.currency === currency).length,
          pendingTransactions: all.filter(
            (tx) => tx.currency === currency && tx.fxPending,
          ).length,
        }));
      }),
    ),
  );
