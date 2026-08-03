import { err, ok } from "neverthrow";
import { type AppResult, appError, ValidationErrorCode } from "@/core/error";
import { isCurrency } from "@/core/money/currency";

export const TRANSACTION_TYPES = [
  "expense",
  "income",
  "transfer",
  "refund",
  "adjustment",
] as const;

export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export const isTransactionType = (value: string): value is TransactionType =>
  (TRANSACTION_TYPES as ReadonlyArray<string>).includes(value);

export type Transaction = Readonly<{
  id: string;
  userId: string;
  walletId: string | null;
  accountId: string;
  counterAccountId: string | null;
  categoryId: string | null;
  merchantId: string | null;
  type: TransactionType;
  amountMinor: number;
  currency: string;

  baseAmountMinor: number | null;
  fxRateE8: number | null;
  fxPending: boolean;
  occurredOn: string;
  note: string | null;
  clientId: string;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
}>;

export type NewTransaction = Readonly<{
  userId: string;
  walletId: string | null;
  accountId: string;
  counterAccountId: string | null;
  categoryId: string | null;
  merchantId: string | null;
  type: TransactionType;
  amountMinor: number;
  currency: string;
  occurredOn: string;
  note: string | null;
  clientId: string;
}>;

const DATE = /^\d{4}-\d{2}-\d{2}$/;

const invalid = (message: string, meta: Record<string, unknown>) =>
  err(appError(ValidationErrorCode.INVALID_INPUT, message, { meta }));

export const validateNewTransaction = (
  input: NewTransaction,
): AppResult<NewTransaction> => {
  if (!Number.isSafeInteger(input.amountMinor)) {
    return invalid("amount must be a whole number of minor units", {
      amountMinor: input.amountMinor,
    });
  }
  if (input.type === "adjustment") {
    if (input.amountMinor === 0) {
      return invalid("an adjustment of zero changes nothing", {});
    }
  } else if (input.amountMinor <= 0) {
    return invalid("amount must be above zero", {
      amountMinor: input.amountMinor,
    });
  }
  if (!isCurrency(input.currency)) {
    return invalid(`unknown currency ${input.currency}`, {
      currency: input.currency,
    });
  }
  if (!DATE.test(input.occurredOn)) {
    return invalid("date must be YYYY-MM-DD", { occurredOn: input.occurredOn });
  }
  if (input.type === "transfer") {
    if (input.counterAccountId === null) {
      return invalid("a transfer needs a destination account", {});
    }
    if (input.counterAccountId === input.accountId) {
      return invalid("a transfer needs two different accounts", {
        accountId: input.accountId,
      });
    }
  } else if (input.counterAccountId !== null) {
    return invalid(`only a transfer has a destination account`, {
      type: input.type,
    });
  }
  if (input.type !== "transfer" && (input.note ?? "").trim() === "") {
    return invalid("say what it was", { type: input.type });
  }
  if (input.clientId === "") {
    return invalid("a transaction needs a client id to stay idempotent", {});
  }
  return ok({ ...input, note: input.note === null ? null : input.note.trim() });
};

const assertNever = (value: never): never => {
  throw new Error(`unhandled transaction type ${String(value)}`);
};

export const signedMinor = (
  transaction: Transaction,
  accountId: string,
): number => {
  const { type, amountMinor } = transaction;
  if (transaction.counterAccountId === accountId) {
    return type === "transfer" ? amountMinor : 0;
  }
  if (transaction.accountId !== accountId) return 0;

  switch (type) {
    case "expense":
      return -amountMinor;
    case "income":
      return amountMinor;
    case "refund":
      return amountMinor;
    case "transfer":
      return -amountMinor;
    case "adjustment":
      return amountMinor;
    default:
      return assertNever(type);
  }
};

export const baseSignedMinor = (transaction: Transaction): number => {
  if (transaction.type === "transfer") return 0;
  const base = transaction.baseAmountMinor;
  if (base === null) return 0;

  switch (transaction.type) {
    case "expense":
      return -base;
    case "income":
      return base;
    case "refund":
      return base;
    case "adjustment":
      return base;
    default:
      return assertNever(transaction.type);
  }
};

export const isLive = (transaction: Transaction): boolean =>
  transaction.deletedAt === null;
