import { eq } from "drizzle-orm";
import type { AppResultAsync } from "@/core/error";
import type { User } from "@/core/users";
import { toUser } from "@/infra/d1/actions/users/list";
import { type DrizzleD1Database, read, write } from "@/infra/d1/connection";
import { sessions, users } from "@/infra/d1/schema";

export type ActiveSession = Readonly<{
  user: User;
  expiresAt: number;
  lastSeenAt: number;
}>;

export const fetchByToken = (
  db: DrizzleD1Database,
  tokenHash: string,
): AppResultAsync<ActiveSession | null> =>
  read("session", () =>
    db
      .select({ session: sessions, user: users })
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id))
      .where(eq(sessions.tokenHash, tokenHash))
      .limit(1),
  ).map((rows) => {
    const row = rows[0];
    if (row === undefined) return null;
    return {
      user: toUser(row.user),
      expiresAt: row.session.expiresAt,
      lastSeenAt: row.session.lastSeenAt,
    };
  });

export const touch = (
  db: DrizzleD1Database,
  tokenHash: string,
  expiresAt: number,
  now: number,
): AppResultAsync<void> =>
  write("session", () =>
    db
      .update(sessions)
      .set({ expiresAt, lastSeenAt: now })
      .where(eq(sessions.tokenHash, tokenHash))
      .run(),
  ).map(() => undefined);
