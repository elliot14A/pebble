import { eq } from "drizzle-orm";
import { errAsync, okAsync } from "neverthrow";
import { type AppResultAsync, appError, ResourceErrorCode } from "@/core/error";
import type { User } from "@/core/users";
import { toUser, type UserRow } from "@/infra/d1/actions/users/list";
import { type DrizzleD1Database, read } from "@/infra/d1/connection";
import { users } from "@/infra/d1/schema";

const first = (id: string) => (rows: ReadonlyArray<UserRow>) => {
  const row = rows[0];
  return row === undefined
    ? errAsync(
        appError(ResourceErrorCode.NOT_FOUND, `no user ${id}`, {
          meta: { id },
        }),
      )
    : okAsync(toUser(row));
};

export const fetch = (
  db: DrizzleD1Database,
  id: string,
): AppResultAsync<User> =>
  read("user", () =>
    db.select().from(users).where(eq(users.id, id)).limit(1),
  ).andThen(first(id));

export const fetchByUsername = (
  db: DrizzleD1Database,
  username: string,
): AppResultAsync<User> =>
  read("user", () =>
    db.select().from(users).where(eq(users.username, username)).limit(1),
  ).andThen(first(username));
