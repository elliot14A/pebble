import { err, ResultAsync } from "neverthrow";
import {
  type AppResult,
  type AppResultAsync,
  appError,
  ValidationErrorCode,
} from "@/core/error";
import { newId } from "@/core/id";
import { parseAmount } from "@/core/money";
import type { Transaction } from "@/core/transactions";
import {
  create,
  fetch as fetchTransaction,
} from "@/infra/d1/actions/transactions";
import type { DrizzleD1Database } from "@/infra/d1/connection";

export type RefundInput = Readonly<{
  userId: string;
  id: string;
  amountText: string;
  today: string;
  now: number;
}>;

export const refund = (
  db: DrizzleD1Database,
  input: RefundInput,
): AppResultAsync<Transaction> => {
  const run = async (): Promise<AppResult<Transaction>> => {
    const original = await fetchTransaction(db, input.userId, input.id);
    if (original.isErr()) return err(original.error);

    const spent = original.value;
    if (spent.type !== "expense") {
      return err(
        appError(
          ValidationErrorCode.INVALID_INPUT,
          "Only money that went out can come back.",
        ),
      );
    }

    const amount = parseAmount(input.amountText, spent.currency);
    if (amount.isErr()) return err(amount.error);
    if (amount.value.minor <= 0) {
      return err(
        appError(
          ValidationErrorCode.INVALID_INPUT,
          "A refund has to be more than nothing.",
        ),
      );
    }
    if (amount.value.minor > spent.amountMinor) {
      return err(
        appError(
          ValidationErrorCode.INVALID_INPUT,
          "A refund cannot be more than what was spent.",
        ),
      );
    }

    const share =
      spent.baseAmountMinor === null
        ? null
        : Math.round(
            (spent.baseAmountMinor * amount.value.minor) / spent.amountMinor,
          );

    return create(db, {
      ...spent,
      id: newId(input.now),
      type: "refund",
      amountMinor: amount.value.minor,
      baseAmountMinor: share,
      occurredOn: input.today,
      note: spent.note === null ? "Refund" : `${spent.note} refund`,
      clientId: newId(input.now),
      createdAt: input.now,
      updatedAt: input.now,
      deletedAt: null,
    });
  };

  return new ResultAsync(run());
};
