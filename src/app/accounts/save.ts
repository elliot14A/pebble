import { err, ok, ResultAsync } from "neverthrow";
import { type Account, type AccountKind, isAccountKind } from "@/core/accounts";
import {
  type AppResult,
  type AppResultAsync,
  appError,
  ValidationErrorCode,
} from "@/core/error";
import { newId } from "@/core/id";
import { isCurrency, parseAmount } from "@/core/money";
import {
  fetch as fetchAccount,
  list as listAccounts,
  save as saveAccount,
} from "@/infra/d1/actions/accounts";
import { countForAccount } from "@/infra/d1/actions/transactions";
import type { DrizzleD1Database } from "@/infra/d1/connection";

export type SaveAccountInput = Readonly<{
  userId: string;

  id?: string | null;
  name: string;
  kind: string;
  currency: string;

  openingText?: string | null;
}>;

const invalid = (message: string) =>
  err(appError(ValidationErrorCode.INVALID_INPUT, message));

export const save = (
  db: DrizzleD1Database,
  input: SaveAccountInput,
  now: number,
): AppResultAsync<Account> => {
  const run = async (): Promise<AppResult<Account>> => {
    const name = input.name.trim();
    if (name === "") return invalid("An account needs a name.");
    if (!isAccountKind(input.kind)) return invalid("Pick an account type.");
    if (!isCurrency(input.currency)) {
      return invalid(`${input.currency} is not a currency pebble knows.`);
    }

    const opening =
      input.openingText == null || input.openingText.trim() === ""
        ? ok({ minor: 0, currency: input.currency })
        : parseAmount(input.openingText, input.currency);
    if (opening.isErr()) return err(opening.error);

    const existing =
      input.id == null ? null : await fetchAccount(db, input.userId, input.id);
    if (existing !== null && existing.isErr()) return err(existing.error);

    if (existing !== null && existing.value.currency !== input.currency) {
      const used = await countForAccount(db, input.userId, existing.value.id);
      if (used.isErr()) return err(used.error);
      if (used.value > 0) {
        return invalid(
          "This account already has transactions, so its currency cannot change. Make a new account instead.",
        );
      }
    }

    const order = await listAccounts(db, input.userId);
    if (order.isErr()) return err(order.error);

    return saveAccount(db, {
      id: existing?.value.id ?? newId(now),
      userId: input.userId,
      name,
      kind: input.kind as AccountKind,
      currency: input.currency,
      openingBalanceMinor: opening.value.minor,
      sortOrder: existing?.value.sortOrder ?? order.value.length,
      archivedAt: existing?.value.archivedAt ?? null,
    });
  };

  return new ResultAsync(run());
};
