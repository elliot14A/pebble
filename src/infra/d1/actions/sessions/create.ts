import type { AppResultAsync } from "@/core/error";
import { newId } from "@/core/id";
import { type DrizzleD1Database, write } from "@/infra/d1/connection";
import { sessions } from "@/infra/d1/schema";

export const create = (
  db: DrizzleD1Database,
  userId: string,
  tokenHash: string,
  expiresAt: number,
  now: number,
): AppResultAsync<void> =>
  write("session", () =>
    db
      .insert(sessions)
      .values({
        id: newId(now),
        userId,
        tokenHash,
        expiresAt,
        lastSeenAt: now,
      })
      .run(),
  ).map(() => undefined);
