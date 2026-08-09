import { err, ok, ResultAsync } from "neverthrow";
import { visible } from "@/app/categories";
import { create } from "@/app/transactions";
import {
  type AppResult,
  type AppResultAsync,
  appError,
  ValidationErrorCode,
} from "@/core/error";
import { fingerprint, type Line, read } from "@/core/statements";
import { fetch as fetchAccount } from "@/infra/d1/actions/accounts";
import { list as listTransactions } from "@/infra/d1/actions/transactions";
import type { DrizzleD1Database } from "@/infra/d1/connection";

export const MAX_LINES = 2_000;

export type Seen = Readonly<{ line: Line; already: boolean }>;

export type Preview = Readonly<{
  accountId: string;
  seen: ReadonlyArray<Seen>;
  skipped: number;
  fresh: number;
}>;

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
        appError(
          ValidationErrorCode.INVALID_INPUT,
          "Nothing in that file looked like a statement. It needs a header row with a date column.",
        ),
      );
    }

    const lines = found.lines.slice(0, MAX_LINES);
    const already = await known(db, userId, accountId, lines);

    const seen = lines.map((line) => ({
      line,
      already: already.has(fingerprint(accountId, line)),
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
  today: string,
  baseCurrency: string,
): AppResultAsync<Imported> => {
  const run = async (): Promise<AppResult<Imported>> => {
    const seen = await preview(db, userId, accountId, text);
    if (seen.isErr()) return err(seen.error);

    const known = await visible(db, userId);
    const byName = new Map(
      known.isOk()
        ? known.value.map((one) => [one.name.trim().toLowerCase(), one.id])
        : [],
    );

    let added = 0;
    let skipped = 0;

    for (const row of seen.value.seen) {
      if (row.already) {
        skipped += 1;
        continue;
      }

      const made = await create(
        db,
        {
          userId,
          accountId,
          type: row.line.direction === "in" ? "income" : "expense",
          categoryId:
            byName.get(row.line.category.trim().toLowerCase()) ?? null,
          amountText: row.line.amountText,
          occurredOn: row.line.occurredOn,
          note:
            row.line.description === ""
              ? "From the statement"
              : row.line.description,
          clientId: fingerprint(accountId, row.line),
        },
        { baseCurrency, now, today },
      );

      if (made.isOk()) added += 1;
      else skipped += 1;
    }

    return ok({ added, skipped });
  };

  return new ResultAsync(run());
};
