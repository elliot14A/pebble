import { eq, lt, or } from "drizzle-orm";
import type { AppResultAsync } from "@/core/error";
import { type DrizzleD1Database, write } from "@/infra/d1/connection";
import { sessions } from "@/infra/d1/schema";

export const remove = (
  db: DrizzleD1Database,
  tokenHash: string,
): AppResultAsync<void> =>
  write("session", () =>
    db.delete(sessions).where(eq(sessions.tokenHash, tokenHash)).run(),
  ).map(() => undefined);

export const removeForUser = (
  db: DrizzleD1Database,
  userId: string,
  now: number,
): AppResultAsync<void> =>
  write("sessions", () =>
    db
      .delete(sessions)
      .where(or(eq(sessions.userId, userId), lt(sessions.expiresAt, now)))
      .run(),
  ).map(() => undefined);
