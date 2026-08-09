import { asc } from "drizzle-orm";
import type { AppResultAsync } from "@/core/error";
import type { User } from "@/core/users";
import { type DrizzleD1Database, read } from "@/infra/d1/connection";
import { users } from "@/infra/d1/schema";

export type UserRow = typeof users.$inferSelect;

export const toUser = (row: UserRow): User => ({
  id: row.id,
  username: row.username,
  displayName: row.displayName,
  role: row.role,
  baseCurrency: row.baseCurrency,
  passwordHash: row.passwordHash,
  status: row.status,
  mustChangePassword: row.mustChangePassword,
  failedAttempts: row.failedAttempts,
  lockedUntil: row.lockedUntil,
  createdAt: row.createdAt,
});

export const list = (
  db: DrizzleD1Database,
): AppResultAsync<ReadonlyArray<User>> =>
  read("users", () =>
    db.select().from(users).orderBy(asc(users.createdAt)),
  ).map((rows) => rows.map(toUser));
