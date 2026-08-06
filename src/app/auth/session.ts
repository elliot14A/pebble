import { err, ok, ResultAsync } from "neverthrow";
import { expiryFrom, hashToken, newSessionToken } from "@/core/auth/session";
import type { AppResult, AppResultAsync } from "@/core/error";
import { create, remove, removeForUser } from "@/infra/d1/actions/sessions";
import type { DrizzleD1Database } from "@/infra/d1/connection";

export const startSession = (
  db: DrizzleD1Database,
  userId: string,
  now: number,
): AppResultAsync<string> => {
  const run = async (): Promise<AppResult<string>> => {
    const token = newSessionToken();
    const stored = await create(
      db,
      userId,
      await hashToken(token),
      expiryFrom(now),
      now,
    );
    return stored.isErr() ? err(stored.error) : ok(token);
  };

  return new ResultAsync(run());
};

export const signOut = (
  db: DrizzleD1Database,
  token: string,
): AppResultAsync<void> => {
  const run = async (): Promise<AppResult<void>> =>
    await remove(db, await hashToken(token));

  return new ResultAsync(run());
};

export const signOutEverywhere = (
  db: DrizzleD1Database,
  userId: string,
  now: number,
): AppResultAsync<void> => removeForUser(db, userId, now);
