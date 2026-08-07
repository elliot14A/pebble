import { err, ResultAsync } from "neverthrow";
import type { Budget } from "@/core/budgets/budget";
import {
  type AppResult,
  type AppResultAsync,
  appError,
  ValidationErrorCode,
} from "@/core/error";
import { newId } from "@/core/id";
import { parseAmount } from "@/core/money/money";
import { list as listBudgets, save } from "@/infra/d1/actions/budgets";
import type { DrizzleD1Database } from "@/infra/d1/connection";

export type SetBudgetInput = Readonly<{
  userId: string;
  categoryId: string | null;
  amountText: string;
  currency: string;
  now: number;
}>;

export const set = (
  db: DrizzleD1Database,
  input: SetBudgetInput,
): AppResultAsync<Budget> => {
  const run = async (): Promise<AppResult<Budget>> => {
    const amount = parseAmount(input.amountText, input.currency);
    if (amount.isErr()) return err(amount.error);
    if (amount.value.minor <= 0) {
      return err(
        appError(
          ValidationErrorCode.INVALID_INPUT,
          "A budget has to be more than nothing.",
        ),
      );
    }

    const existing = await listBudgets(db, input.userId);
    if (existing.isErr()) return err(existing.error);

    const already = existing.value.find(
      (budget) => budget.categoryId === input.categoryId,
    );

    return save(db, {
      id: already?.id ?? newId(input.now),
      userId: input.userId,
      categoryId: input.categoryId,
      limitMinor: amount.value.minor,
      createdAt: already?.createdAt ?? input.now,
      archivedAt: null,
    });
  };

  return new ResultAsync(run());
};
