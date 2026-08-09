import type { AppResultAsync } from "@/core/error";
import type { Recurring } from "@/core/recurring";
import { type DrizzleD1Database, write } from "@/infra/d1/connection";
import { recurring } from "@/infra/d1/schema";

export const save = (
  db: DrizzleD1Database,
  rule: Recurring,
): AppResultAsync<Recurring> =>
  write("recurring", () =>
    db
      .insert(recurring)
      .values(rule)
      .onConflictDoUpdate({ target: recurring.id, set: rule })
      .run(),
  ).map(() => rule);
