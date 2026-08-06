import { err, ok, ResultAsync } from "neverthrow";
import { startSession } from "@/app/auth/session";
import {
  burnPasswordTime,
  hashPassword,
  needsRehash,
  verifyPassword,
} from "@/core/auth/password";
import {
  type AppResult,
  type AppResultAsync,
  appError,
  ResourceErrorCode,
  ValidationErrorCode,
} from "@/core/error";
import type { User } from "@/core/users/user";
import { fetchByUsername } from "@/infra/d1/actions/users";
import {
  clearFailures,
  recordFailure,
  setPassword,
} from "@/infra/d1/actions/users/security";
import type { DrizzleD1Database } from "@/infra/d1/connection";

const MAX_ATTEMPTS = 8;
const LOCK_MS = 15 * 60 * 1000;

export type LoginResult = Readonly<{ token: string; user: User }>;

const refused = () =>
  appError(
    ValidationErrorCode.INVALID_INPUT,
    "That username and password do not match.",
  );

export const login = (
  db: DrizzleD1Database,
  username: string,
  password: string,
  now: number,
): AppResultAsync<LoginResult> => {
  const run = async (): Promise<AppResult<LoginResult>> => {
    const found = await fetchByUsername(db, username.trim().toLowerCase());

    if (found.isErr()) {
      await burnPasswordTime(password);
      return err(refused());
    }

    const user = found.value;
    const locked = user.lockedUntil !== null && user.lockedUntil > now;
    const matches = await verifyPassword(password, user.passwordHash);

    if (locked) {
      return err(
        matches
          ? appError(
              ResourceErrorCode.FORBIDDEN,
              "Too many attempts. Try again in a few minutes.",
            )
          : refused(),
      );
    }

    if (!matches) {
      const spent = user.lockedUntil === null ? user.failedAttempts : 0;
      const attempts = spent + 1;
      const recorded = await recordFailure(
        db,
        user.id,
        attempts,
        attempts >= MAX_ATTEMPTS ? now + LOCK_MS : null,
      );
      if (recorded.isErr()) return err(recorded.error);
      return err(refused());
    }

    if (user.status === "disabled") {
      return err(
        appError(ResourceErrorCode.FORBIDDEN, "That account is disabled."),
      );
    }

    const cleared = await clearFailures(db, user.id);
    if (cleared.isErr()) return err(cleared.error);

    if (needsRehash(user.passwordHash)) {
      const upgraded = await setPassword(
        db,
        user.id,
        await hashPassword(password),
        user.mustChangePassword,
      );
      if (upgraded.isErr()) return err(upgraded.error);
    }

    const started = await startSession(db, user.id, now);
    if (started.isErr()) return err(started.error);

    return ok({ token: started.value, user });
  };

  return new ResultAsync(run());
};
