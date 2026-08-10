import { isNull, sql } from "drizzle-orm";
import type { AppResultAsync } from "@/core/error";
import { type DrizzleD1Database, read } from "@/infra/d1/connection";
import { sessions, transactions } from "@/infra/d1/schema";

export type Activity = Readonly<{
  userId: string;
  lastSeenAt: number | null;
  entries: number;
}>;

export const activity = (
  db: DrizzleD1Database,
): AppResultAsync<ReadonlyMap<string, Activity>> =>
  read("activity", () =>
    db
      .select({
        userId: sessions.userId,
        lastSeenAt: sql<number>`max(${sessions.lastSeenAt})`,
      })
      .from(sessions)
      .groupBy(sessions.userId),
  ).andThen((seen) =>
    read("activity", () =>
      db
        .select({
          userId: transactions.userId,
          entries: sql<number>`count(*)`,
        })
        .from(transactions)
        .where(isNull(transactions.deletedAt))
        .groupBy(transactions.userId),
    ).map((counted) => {
      const found = new Map<string, Activity>();

      for (const row of seen) {
        found.set(row.userId, {
          userId: row.userId,
          lastSeenAt: row.lastSeenAt,
          entries: 0,
        });
      }
      for (const row of counted) {
        const held = found.get(row.userId);
        found.set(row.userId, {
          userId: row.userId,
          lastSeenAt: held?.lastSeenAt ?? null,
          entries: row.entries,
        });
      }

      return found;
    }),
  );
