import { err, ok, ResultAsync } from "neverthrow";
import { signOutEverywhere } from "@/app/auth/session";
import {
  checkPassword,
  hashPassword,
  verifyPassword,
} from "@/core/auth/password";
import {
  type AppResult,
  type AppResultAsync,
  appError,
  ValidationErrorCode,
} from "@/core/error";
import type { User } from "@/core/users/user";
import { setPassword } from "@/infra/d1/actions/users";
import type { DrizzleD1Database } from "@/infra/d1/connection";

export const changePassword = (
  db: DrizzleD1Database,
  user: User,
  current: string,
  next: string,
  confirm: string,
  now: number,
): AppResultAsync<void> => {
  const run = async (): Promise<AppResult<void>> => {
    if (next !== confirm) {
      return err(
        appError(
          ValidationErrorCode.INVALID_INPUT,
          "The two new passwords do not match.",
        ),
      );
    }

    const strong = checkPassword(next);
    if (strong.isErr()) return err(strong.error);

    if (!(await verifyPassword(current, user.passwordHash))) {
      return err(
        appError(
          ValidationErrorCode.INVALID_INPUT,
          "That is not your current password.",
        ),
      );
    }

    if (current === next) {
      return err(
        appError(
          ValidationErrorCode.INVALID_INPUT,
          "The new password has to be different.",
        ),
      );
    }

    const saved = await setPassword(
      db,
      user.id,
      await hashPassword(next),
      false,
    );
    if (saved.isErr()) return err(saved.error);

    const cleared = await signOutEverywhere(db, user.id, now);
    return cleared.isErr() ? err(cleared.error) : ok(undefined);
  };

  return new ResultAsync(run());
};
