import { and, eq, isNull, sql } from "drizzle-orm";
import type { AppResultAsync } from "@/core/error";
import { type DrizzleD1Database, write } from "@/infra/d1/connection";
import { shares } from "@/infra/d1/schema";

export const revoke = (
  db: DrizzleD1Database,
  userId: string,
  id: string,
  now: number,
): AppResultAsync<void> =>
  write("share", () =>
    db
      .update(shares)
      .set({ revokedAt: now })
      .where(
        and(
          eq(shares.id, id),
          eq(shares.userId, userId),
          isNull(shares.revokedAt),
        ),
      )
      .run(),
  ).map(() => undefined);

export const touch = (
  db: DrizzleD1Database,
  token: string,
  now: number,
): AppResultAsync<void> =>
  write("share", () =>
    db
      .update(shares)
      .set({ viewCount: sql`${shares.viewCount} + 1`, lastViewedAt: now })
      .where(eq(shares.token, token))
      .run(),
  ).map(() => undefined);
