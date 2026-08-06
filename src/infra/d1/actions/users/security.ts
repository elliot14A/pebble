import { eq } from "drizzle-orm";
import type { AppResultAsync } from "@/core/error";
import { type DrizzleD1Database, write } from "@/infra/d1/connection";
import { users } from "@/infra/d1/schema";

export const recordFailure = (
  db: DrizzleD1Database,
  userId: string,
  failedAttempts: number,
  lockedUntil: number | null,
): AppResultAsync<void> =>
  write("login attempt", () =>
    db
      .update(users)
      .set({ failedAttempts, lockedUntil })
      .where(eq(users.id, userId))
      .run(),
  ).map(() => undefined);

export const clearFailures = (
  db: DrizzleD1Database,
  userId: string,
): AppResultAsync<void> =>
  write("login attempt", () =>
    db
      .update(users)
      .set({ failedAttempts: 0, lockedUntil: null })
      .where(eq(users.id, userId))
      .run(),
  ).map(() => undefined);

export const setPassword = (
  db: DrizzleD1Database,
  userId: string,
  passwordHash: string,
  mustChangePassword: boolean,
): AppResultAsync<void> =>
  write("password", () =>
    db
      .update(users)
      .set({
        passwordHash,
        mustChangePassword,
        failedAttempts: 0,
        lockedUntil: null,
      })
      .where(eq(users.id, userId))
      .run(),
  ).map(() => undefined);

export const setStatus = (
  db: DrizzleD1Database,
  userId: string,
  status: "active" | "disabled",
): AppResultAsync<void> =>
  write("user status", () =>
    db.update(users).set({ status }).where(eq(users.id, userId)).run(),
  ).map(() => undefined);
