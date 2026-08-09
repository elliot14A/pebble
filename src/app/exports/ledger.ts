import type { AppResultAsync } from "@/core/error";
import { csv } from "@/core/exports";
import { currencyOf } from "@/core/money";
import { list as listAccounts } from "@/infra/d1/actions/accounts";
import { list as listCategories } from "@/infra/d1/actions/categories";
import { list as listTransactions } from "@/infra/d1/actions/transactions";
import type { DrizzleD1Database } from "@/infra/d1/connection";

const HEADER = [
  "date",
  "type",
  "name",
  "category",
  "account",
  "currency",
  "amount",
  "base_currency",
  "base_amount",
] as const;

const plain = (minor: number | null, currency: string): string => {
  if (minor === null) return "";
  const found = currencyOf(currency);
  const places = found.isOk() ? found.value.exponent : 2;
  return places === 0 ? String(minor) : (minor / 10 ** places).toFixed(places);
};

export const ledgerCsv = (
  db: DrizzleD1Database,
  userId: string,
  baseCurrency: string,
  from: string,
  to: string,
): AppResultAsync<string> =>
  listTransactions(db, { userId, from, to }).andThen((entries) =>
    listCategories(db, userId).andThen((categories) =>
      listAccounts(db, userId).map((accounts) => {
        const categoryOf = new Map(categories.map((c) => [c.id, c.name]));
        const accountOf = new Map(accounts.map((a) => [a.id, a.name]));

        const rows = [...entries]
          .sort((a, b) =>
            a.occurredOn === b.occurredOn
              ? a.createdAt - b.createdAt
              : a.occurredOn < b.occurredOn
                ? -1
                : 1,
          )
          .map((entry) => [
            entry.occurredOn,
            entry.type,
            entry.note ?? "",
            entry.categoryId === null
              ? ""
              : (categoryOf.get(entry.categoryId) ?? ""),
            accountOf.get(entry.accountId) ?? "",
            entry.currency,
            plain(entry.amountMinor, entry.currency),
            baseCurrency,
            plain(entry.baseAmountMinor, baseCurrency),
          ]);

        return csv([...HEADER], rows);
      }),
    ),
  );
