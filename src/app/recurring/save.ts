import { err, ok, ResultAsync } from "neverthrow";
import {
  type AppResult,
  type AppResultAsync,
  appError,
  ResourceErrorCode,
  ValidationErrorCode,
} from "@/core/error";
import { newId, newId as nextId } from "@/core/id";
import { parseAmount } from "@/core/money";
import {
  isEvery,
  nextAfter,
  type Recurring,
  type RecurringKind,
} from "@/core/recurring";
import { fetch as fetchAccount } from "@/infra/d1/actions/accounts";
import {
  advance,
  remove as archive,
  fetch as fetchRule,
  save as saveRule,
} from "@/infra/d1/actions/recurring";
import { create } from "@/infra/d1/actions/transactions";
import type { DrizzleD1Database } from "@/infra/d1/connection";

export type RuleInput = Readonly<{
  userId: string;
  id: string | null;
  kind: string;
  type: string;
  name: string;
  amountText: string;
  accountId: string;
  categoryId: string | null;
  every: string;
  startOn: string;
  now: number;
}>;

const invalid = (message: string) =>
  appError(ValidationErrorCode.INVALID_INPUT, message);

export const save = (
  db: DrizzleD1Database,
  input: RuleInput,
): AppResultAsync<Recurring> => {
  const run = async (): Promise<AppResult<Recurring>> => {
    const name = input.name.trim().replace(/\s+/g, " ");
    if (name === "") return err(invalid("Give it a name."));
    if (!isEvery(input.every)) return err(invalid("Pick how often."));
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.startOn)) {
      return err(invalid("Pick when it starts."));
    }

    const account = await fetchAccount(db, input.userId, input.accountId);
    if (account.isErr()) return err(account.error);

    const amount = parseAmount(input.amountText, account.value.currency);
    if (amount.isErr()) return err(amount.error);
    if (amount.value.minor <= 0) {
      return err(invalid("An amount of nothing repeats nothing."));
    }

    const kind: RecurringKind = input.kind === "bill" ? "bill" : "transaction";
    const type = input.type === "income" ? "income" : "expense";
    const dayOfMonth = Number(input.startOn.slice(8, 10));

    const existing =
      input.id === null ? null : await fetchRule(db, input.userId, input.id);
    if (existing !== null && existing.isErr()) return err(existing.error);
    if (existing !== null && existing.value === null) {
      return err(
        appError(ResourceErrorCode.NOT_FOUND, "That schedule is not here."),
      );
    }

    const current = existing === null ? null : existing.value;

    return saveRule(db, {
      id: current?.id ?? newId(input.now),
      userId: input.userId,
      kind,
      type,
      name,
      amountMinor: amount.value.minor,
      currency: account.value.currency,
      accountId: input.accountId,
      categoryId: input.categoryId,
      every: input.every,
      dayOfMonth,
      nextOn: input.startOn,
      lastRunOn: current?.lastRunOn ?? null,
      createdAt: current?.createdAt ?? input.now,
      archivedAt: null,
    });
  };

  return new ResultAsync(run());
};

export const remove = (
  db: DrizzleD1Database,
  userId: string,
  id: string,
  now: number,
): AppResultAsync<void> => archive(db, userId, id, now);

/** Marking a bill paid is what writes it into the ledger and moves it on. */
export const pay = (
  db: DrizzleD1Database,
  userId: string,
  id: string,
  baseCurrency: string,
  now: number,
): AppResultAsync<void> => {
  const run = async (): Promise<AppResult<void>> => {
    const found = await fetchRule(db, userId, id);
    if (found.isErr()) return err(found.error);
    if (found.value === null) {
      return err(
        appError(ResourceErrorCode.NOT_FOUND, "That bill is not here."),
      );
    }

    const rule = found.value;
    const on = rule.nextOn;

    const made = await create(db, {
      id: nextId(now),
      userId,
      accountId: rule.accountId,
      counterAccountId: null,
      categoryId: rule.categoryId,
      merchantId: null,
      walletId: null,
      type: rule.type,
      amountMinor: rule.amountMinor,
      currency: rule.currency,
      baseAmountMinor: rule.currency === baseCurrency ? rule.amountMinor : null,
      fxRateE8: null,
      fxPending: rule.currency !== baseCurrency,
      occurredOn: on,
      note: rule.name,
      clientId: `recurring:${rule.id}:${on}`,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    });
    if (made.isErr()) return err(made.error);

    const moved = await advance(
      db,
      rule.id,
      nextAfter(on, rule.every, rule.dayOfMonth),
      on,
    );
    return moved.isErr() ? err(moved.error) : ok(undefined);
  };

  return new ResultAsync(run());
};
