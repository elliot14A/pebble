import { err, ok, ResultAsync } from "neverthrow";
import { visible } from "@/app/categories";
import {
  type AppResult,
  type AppResultAsync,
  appError,
  ValidationErrorCode,
} from "@/core/error";
import { newId } from "@/core/id";
import { normalizeMerchant } from "@/core/merchants";
import { parseAmount } from "@/core/money";
import { convert, rateOn } from "@/core/rates";
import { fingerprints, type Line, type Reading, read } from "@/core/statements";
import { type Transaction, validateNewTransaction } from "@/core/transactions";
import { fetch as fetchAccount } from "@/infra/d1/actions/accounts";
import { list as listMerchants } from "@/infra/d1/actions/merchants";
import { list as listRates } from "@/infra/d1/actions/rates";
import {
  createMany,
  list as listTransactions,
} from "@/infra/d1/actions/transactions";
import type { DrizzleD1Database } from "@/infra/d1/connection";

export const MAX_LINES = 1_500;

export type Seen = Readonly<{
  line: Line;
  clientId: string;
  already: boolean;
}>;

export type Preview = Readonly<{
  accountId: string;
  seen: ReadonlyArray<Seen>;
  skipped: number;
  fresh: number;
}>;

const complaintAbout = (found: Reading): string =>
  found.header.length === 0
    ? "Nothing in that file looked like a statement. It needs a header row with a date column."
    : `pebble found the columns ${found.header
        .filter((cell) => cell !== "")
        .join(
          ", ",
        )} but could not tell which one holds the amount. Rename it to amount.`;

const known = async (
  db: DrizzleD1Database,
  userId: string,
  accountId: string,
  lines: ReadonlyArray<Line>,
): Promise<ReadonlySet<string>> => {
  const dates = lines.map((line) => line.occurredOn).sort();
  const held = await listTransactions(db, {
    userId,
    from: dates[0],
    to: dates[dates.length - 1],
  });

  return held.isErr()
    ? new Set()
    : new Set(
        held.value
          .filter((row) => row.clientId.startsWith(`import:${accountId}:`))
          .map((row) => row.clientId),
      );
};

export const preview = (
  db: DrizzleD1Database,
  userId: string,
  accountId: string,
  text: string,
): AppResultAsync<Preview> => {
  const run = async (): Promise<AppResult<Preview>> => {
    const account = await fetchAccount(db, userId, accountId);
    if (account.isErr()) return err(account.error);

    const found = read(text);
    if (found.lines.length === 0) {
      return err(
        appError(ValidationErrorCode.INVALID_INPUT, complaintAbout(found)),
      );
    }

    const lines = found.lines.slice(0, MAX_LINES);
    const already = await known(db, userId, accountId, lines);
    const marks = fingerprints(accountId, lines);

    const seen = lines.map((line, at) => ({
      line,
      clientId: marks[at] ?? "",
      already: already.has(marks[at] ?? ""),
    }));

    return ok({
      accountId,
      seen,
      skipped: found.skipped + (found.lines.length - lines.length),
      fresh: seen.filter((row) => !row.already).length,
    });
  };

  return new ResultAsync(run());
};

export type Imported = Readonly<{ added: number; skipped: number }>;

export const bring = (
  db: DrizzleD1Database,
  userId: string,
  accountId: string,
  text: string,
  now: number,
  baseCurrency: string,
): AppResultAsync<Imported> => {
  const run = async (): Promise<AppResult<Imported>> => {
    const account = await fetchAccount(db, userId, accountId);
    if (account.isErr()) return err(account.error);

    const seen = await preview(db, userId, accountId, text);
    if (seen.isErr()) return err(seen.error);

    const currency = account.value.currency;
    const categories = await visible(db, userId);
    const byName = new Map(
      categories.isOk()
        ? categories.value.map((one) => [one.name.trim().toLowerCase(), one.id])
        : [],
    );

    const merchants = await listMerchants(db, userId, 5_000);
    const byMerchant = new Map(
      merchants.isOk()
        ? merchants.value.map((one) => [one.normalizedName, one.id])
        : [],
    );

    const rates =
      currency === baseCurrency ? null : await listRates(db, userId);
    if (rates !== null && rates.isErr()) return err(rates.error);

    const rows: Transaction[] = [];
    let skipped = 0;

    for (const row of seen.value.seen) {
      if (row.already) {
        skipped += 1;
        continue;
      }

      const amount = parseAmount(row.line.amountText, currency);
      if (amount.isErr()) {
        skipped += 1;
        continue;
      }

      const note =
        row.line.description === ""
          ? "From the statement"
          : row.line.description;

      const draft = validateNewTransaction({
        userId,
        walletId: null,
        accountId,
        counterAccountId: null,
        categoryId: byName.get(row.line.category.trim().toLowerCase()) ?? null,
        merchantId: byMerchant.get(normalizeMerchant(note)) ?? null,
        type: row.line.direction === "in" ? "income" : "expense",
        amountMinor: amount.value.minor,
        currency,
        occurredOn: row.line.occurredOn,
        note,
        tags: null,
        clientId: row.clientId,
      });
      if (draft.isErr()) {
        skipped += 1;
        continue;
      }

      const rate =
        rates === null || rates.isErr()
          ? null
          : rateOn(rates.value, currency, draft.value.occurredOn);
      const based =
        rates === null
          ? { minor: draft.value.amountMinor }
          : rate === null
            ? null
            : convert(
                { minor: draft.value.amountMinor, currency },
                baseCurrency,
                rate.rateE8,
              ).unwrapOr(null);

      rows.push({
        ...draft.value,
        id: newId(now),
        baseAmountMinor: based === null ? null : based.minor,
        fxRateE8: rate === null ? null : rate.rateE8,
        fxPending: based === null,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      });
    }

    if (rows.length === 0) return ok({ added: 0, skipped });

    const saved = await createMany(db, rows);
    if (saved.isErr()) return err(saved.error);

    return ok({
      added: saved.value,
      skipped: skipped + (rows.length - saved.value),
    });
  };

  return new ResultAsync(run());
};
