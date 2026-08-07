import { err, ok, ResultAsync } from "neverthrow";
import { signOutEverywhere } from "@/app/auth/session";
import { checkPassword, hashPassword } from "@/core/auth/password";
import {
  type AppResult,
  type AppResultAsync,
  appError,
  ResourceErrorCode,
  ValidationErrorCode,
} from "@/core/error";
import { newId } from "@/core/id";
import type { User } from "@/core/users/user";
import {
  fetchByUsername,
  fetch as fetchUser,
  save as saveUser,
  setPassword,
  setStatus,
} from "@/infra/d1/actions/users";
import type { DrizzleD1Database } from "@/infra/d1/connection";

const USERNAME = /^[a-z0-9][a-z0-9._-]{1,29}$/;

export type NewUserInput = Readonly<{
  username: string;
  displayName: string;
  role: "super_admin" | "user";
  temporaryPassword: string;
  baseCurrency: string;
}>;

export const createUser = (
  db: DrizzleD1Database,
  input: NewUserInput,
  now: number,
): AppResultAsync<User> => {
  const run = async (): Promise<AppResult<User>> => {
    const username = input.username.trim().toLowerCase();
    if (!USERNAME.test(username)) {
      return err(
        appError(
          ValidationErrorCode.INVALID_INPUT,
          "A username is 2 to 30 characters: letters, numbers, dot, dash or underscore.",
        ),
      );
    }

    const display = input.displayName.trim();
    if (display === "") {
      return err(
        appError(ValidationErrorCode.INVALID_INPUT, "Give them a name."),
      );
    }

    const strong = checkPassword(input.temporaryPassword);
    if (strong.isErr()) return err(strong.error);

    const taken = await fetchByUsername(db, username);
    if (taken.isOk()) {
      return err(
        appError(ResourceErrorCode.CONFLICT, `${username} is already taken.`, {
          meta: { username },
        }),
      );
    }

    return saveUser(db, {
      id: newId(now),
      username,
      displayName: display,
      role: input.role,
      baseCurrency: input.baseCurrency,
      passwordHash: await hashPassword(input.temporaryPassword),
      status: "active",
      mustChangePassword: true,
      failedAttempts: 0,
      lockedUntil: null,
      createdAt: now,
    });
  };

  return new ResultAsync(run());
};

export const resetPassword = (
  db: DrizzleD1Database,
  userId: string,
  temporary: string,
  now: number,
): AppResultAsync<void> => {
  const run = async (): Promise<AppResult<void>> => {
    const strong = checkPassword(temporary);
    if (strong.isErr()) return err(strong.error);

    const target = await fetchUser(db, userId);
    if (target.isErr()) return err(target.error);

    const saved = await setPassword(
      db,
      userId,
      await hashPassword(temporary),
      true,
    );
    if (saved.isErr()) return err(saved.error);

    const cleared = await signOutEverywhere(db, userId, now);
    return cleared.isErr() ? err(cleared.error) : ok(undefined);
  };

  return new ResultAsync(run());
};

export const setUserStatus = (
  db: DrizzleD1Database,
  actor: User,
  userId: string,
  status: "active" | "disabled",
  now: number,
): AppResultAsync<void> => {
  const run = async (): Promise<AppResult<void>> => {
    if (actor.id === userId && status === "disabled") {
      return err(
        appError(
          ValidationErrorCode.INVALID_INPUT,
          "You cannot disable your own account.",
        ),
      );
    }

    const target = await fetchUser(db, userId);
    if (target.isErr()) return err(target.error);

    const changed = await setStatus(db, userId, status);
    if (changed.isErr()) return err(changed.error);
    if (status === "active") return ok(undefined);

    const cleared = await signOutEverywhere(db, userId, now);
    return cleared.isErr() ? err(cleared.error) : ok(undefined);
  };

  return new ResultAsync(run());
};
