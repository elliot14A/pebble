import { err, ok, ResultAsync } from "neverthrow";
import {
  type AppResult,
  type AppResultAsync,
  appError,
  ResourceErrorCode,
  ValidationErrorCode,
} from "@/core/error";
import { type Goal, isReached, MAX_NAME } from "@/core/goals";
import { newId } from "@/core/id";
import { parseAmount } from "@/core/money";
import { fetch as fetchGoal, save as saveGoal } from "@/infra/d1/actions/goals";
import type { DrizzleD1Database } from "@/infra/d1/connection";

export type GoalInput = Readonly<{
  userId: string;
  name: string;
  targetText: string;
  currency: string;
  targetOn: string | null;
  now: number;
}>;

const invalid = (message: string) =>
  appError(ValidationErrorCode.INVALID_INPUT, message);

export const save = (
  db: DrizzleD1Database,
  input: GoalInput,
): AppResultAsync<Goal> => {
  const run = async (): Promise<AppResult<Goal>> => {
    const name = input.name.trim().replace(/\s+/g, " ");
    if (name === "") return err(invalid("Give it a name."));
    if (name.length > MAX_NAME) {
      return err(invalid(`Keep the name under ${MAX_NAME} characters.`));
    }

    const target = parseAmount(input.targetText, input.currency);
    if (target.isErr()) return err(target.error);
    if (target.value.minor <= 0) {
      return err(invalid("Saving toward nothing is not a goal."));
    }

    return saveGoal(db, {
      id: newId(input.now),
      userId: input.userId,
      name,
      targetMinor: target.value.minor,
      savedMinor: 0,
      currency: input.currency,
      accountId: null,
      targetOn: input.targetOn,
      createdAt: input.now,
      reachedAt: null,
      archivedAt: null,
    });
  };

  return new ResultAsync(run());
};

export const putAway = (
  db: DrizzleD1Database,
  userId: string,
  id: string,
  amountText: string,
  now: number,
): AppResultAsync<Goal> => {
  const run = async (): Promise<AppResult<Goal>> => {
    const found = await fetchGoal(db, userId, id);
    if (found.isErr()) return err(found.error);
    if (found.value === null) {
      return err(
        appError(ResourceErrorCode.NOT_FOUND, "That goal is not here."),
      );
    }

    const goal = found.value;
    const amount = parseAmount(amountText, goal.currency);
    if (amount.isErr()) return err(amount.error);
    if (amount.value.minor === 0) {
      return err(invalid("Put something away, or take something out."));
    }

    const savedMinor = Math.max(goal.savedMinor + amount.value.minor, 0);
    const moved: Goal = {
      ...goal,
      savedMinor,
      reachedAt:
        isReached({ ...goal, savedMinor }) && goal.reachedAt === null
          ? now
          : goal.reachedAt,
    };

    const stored = await saveGoal(db, moved);
    return stored.isErr() ? err(stored.error) : ok(moved);
  };

  return new ResultAsync(run());
};
