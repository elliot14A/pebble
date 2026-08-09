import { type AccountBalance, balances } from "@/app/accounts";
import type { AppResultAsync } from "@/core/error";
import type { Transaction } from "@/core/transactions";
import { flowMinor } from "@/core/transactions";
import { list as listTransactions } from "@/infra/d1/actions/transactions";
import type { DrizzleD1Database } from "@/infra/d1/connection";

export type Overview = Readonly<{
  netWorthMinor: number;

  unconvertedAccounts: number;
  inMinor: number;
  outMinor: number;
  savedMinor: number;

  savingsRateBps: number;
  dailyAverageMinor: number;
  accounts: ReadonlyArray<AccountBalance>;
  recent: ReadonlyArray<Transaction>;
  fxPendingCount: number;
  month: string;
}>;

const RECENT_LIMIT = 6;

export const monthOf = (date: string): string => date.slice(0, 7);

export const overview = (
  db: DrizzleD1Database,
  userId: string,
  baseCurrency: string,
  today: string,
): AppResultAsync<Overview> =>
  balances(db, userId, baseCurrency, today).andThen((accounts) =>
    listTransactions(db, { userId }).map((all) => {
      const month = monthOf(today);
      const flow = flowMinor(
        all.filter((tx) => monthOf(tx.occurredOn) === month),
      );
      const saved = flow.inMinor - flow.outMinor;
      const elapsed = Math.max(1, Number(today.slice(8, 10)));

      return {
        netWorthMinor: accounts.reduce(
          (total, entry) => total + (entry.baseMinor ?? 0),
          0,
        ),
        unconvertedAccounts: accounts.filter(
          (entry) => entry.baseMinor === null,
        ).length,
        inMinor: flow.inMinor,
        outMinor: flow.outMinor,
        savedMinor: saved,
        savingsRateBps:
          flow.inMinor === 0 ? 0 : Math.round((saved / flow.inMinor) * 10_000),
        dailyAverageMinor: Math.round(flow.outMinor / elapsed),
        accounts,
        recent: all.slice(0, RECENT_LIMIT),
        fxPendingCount: all.filter((tx) => tx.fxPending).length,
        month,
      };
    }),
  );
