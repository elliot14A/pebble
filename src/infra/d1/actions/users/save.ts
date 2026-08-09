import type { AppResultAsync } from "@/core/error";
import type { User } from "@/core/users";
import { type DrizzleD1Database, write } from "@/infra/d1/connection";
import { users } from "@/infra/d1/schema";

export const save = (db: DrizzleD1Database, user: User): AppResultAsync<User> =>
  write("user", () =>
    db
      .insert(users)
      .values(user)
      .onConflictDoUpdate({ target: users.id, set: user })
      .run(),
  ).map(() => user);
