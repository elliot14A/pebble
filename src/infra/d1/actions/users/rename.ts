import { eq } from "drizzle-orm";
import type { AppResultAsync } from "@/core/error";
import { type DrizzleD1Database, write } from "@/infra/d1/connection";
import { users } from "@/infra/d1/schema";

export const rename = (
  db: DrizzleD1Database,
  userId: string,
  displayName: string,
): AppResultAsync<void> =>
  write("user", () =>
    db.update(users).set({ displayName }).where(eq(users.id, userId)).run(),
  ).map(() => undefined);
