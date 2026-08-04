import { err, ok, ResultAsync } from "neverthrow";
import {
  type AppResult,
  type AppResultAsync,
  appError,
  ValidationErrorCode,
} from "@/core/error";
import { newId } from "@/core/id";
import { parseAmount } from "@/core/money/money";
import { convert, rateOn } from "@/core/rates/rate";
import {
  type NewTransaction,
  type Transaction,
  type TransactionType,
  validateNewTransaction,
} from "@/core/transactions/transaction";
import { fetch as fetchAccount } from "@/infra/d1/actions/accounts";
import {
  ensure as ensureMerchant,
  remember as rememberMerchant,
} from "@/infra/d1/actions/merchants";
import { list as listRates } from "@/infra/d1/actions/rates";
import { create as insert } from "@/infra/d1/actions/transactions";
import type { DrizzleD1Database } from "@/infra/d1/connection";

export type NewTransactionInput = Readonly<{
  userId: string;
  accountId: string;
  counterAccountId?: string | null;
  categoryId?: string | null;
  merchantId?: string | null;
  walletId?: string | null;
  type: TransactionType;

  amountText: string;
  occurredOn?: string;
  note?: string | null;
  clientId: string;
}>;

export type CreateOptions = Readonly<{
  baseCurrency: string;
  now: number;
  today: string;
}>;

type Frozen = Readonly<{
  baseAmountMinor: number | null;
  fxRateE8: number | null;
  fxPending: boolean;
}>;

const freeze = async (
  db: DrizzleD1Database,
  draft: NewTransaction,
  options: CreateOptions,
): Promise<AppResult<Frozen>> => {
  if (draft.currency === options.baseCurrency) {
    return ok({
      baseAmountMinor: draft.amountMinor,
      fxRateE8: null,
      fxPending: false,
    });
  }

  const rates = await listRates(db, draft.userId);
  if (rates.isErr()) return err(rates.error);

  const rate = rateOn(rates.value, draft.currency, draft.occurredOn);
  if (rate === null) {
    return ok({ baseAmountMinor: null, fxRateE8: null, fxPending: true });
  }

  return convert(
    { minor: draft.amountMinor, currency: draft.currency },
    options.baseCurrency,
    rate.rateE8,
  ).map((base) => ({
    baseAmountMinor: base.minor,
    fxRateE8: rate.rateE8,
    fxPending: false,
  }));
};

export const create = (
  db: DrizzleD1Database,
  input: NewTransactionInput,
  options: CreateOptions,
): AppResultAsync<Transaction> => {
  const run = async (): Promise<AppResult<Transaction>> => {
    const account = await fetchAccount(db, input.userId, input.accountId);
    if (account.isErr()) return err(account.error);

    if (input.type === "transfer" && input.counterAccountId) {
      const other = await fetchAccount(
        db,
        input.userId,
        input.counterAccountId,
      );
      if (other.isErr()) return err(other.error);
      if (other.value.currency !== account.value.currency) {
        return err(
          appError(
            ValidationErrorCode.INVALID_INPUT,
            "both sides of a transfer must use the same currency",
            {
              meta: { from: account.value.currency, to: other.value.currency },
            },
          ),
        );
      }
    }

    const amount = parseAmount(input.amountText, account.value.currency);
    if (amount.isErr()) return err(amount.error);

    const draft = validateNewTransaction({
      userId: input.userId,
      walletId: input.walletId ?? null,
      accountId: input.accountId,
      counterAccountId: input.counterAccountId ?? null,
      categoryId: input.categoryId ?? null,
      merchantId: input.merchantId ?? null,
      type: input.type,
      amountMinor: amount.value.minor,
      currency: account.value.currency,
      occurredOn: input.occurredOn ?? options.today,
      note: input.note ?? null,
      clientId: input.clientId,
    });
    if (draft.isErr()) return err(draft.error);

    const fx = await freeze(db, draft.value, options);
    if (fx.isErr()) return err(fx.error);

    const named = draft.value.note ?? "";
    const merchant =
      named === ""
        ? null
        : await ensureMerchant(db, input.userId, named, options.now);
    if (merchant !== null && merchant.isErr()) return err(merchant.error);

    const saved = await insert(db, {
      ...draft.value,
      id: newId(options.now),
      merchantId: merchant === null ? null : merchant.value.id,
      baseAmountMinor: fx.value.baseAmountMinor,
      fxRateE8: fx.value.fxRateE8,
      fxPending: fx.value.fxPending,
      createdAt: options.now,
      updatedAt: options.now,
      deletedAt: null,
    });
    if (saved.isErr()) return err(saved.error);

    if (merchant !== null && saved.value.createdAt === options.now) {
      const learned = await rememberMerchant(
        db,
        merchant.value.id,
        named,
        draft.value.categoryId,
      );
      if (learned.isErr()) return err(learned.error);
    }

    return ok(saved.value);
  };

  return new ResultAsync(run());
};
