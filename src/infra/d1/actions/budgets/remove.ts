import { and, eq } from "drizzle-orm";
import type { AppResultAsync } from "@/core/error";
import { type DrizzleD1Database, write } from "@/infra/d1/connection";
import { budgets } from "@/infra/d1/schema";

export const remove = (
  db: DrizzleD1Database,
  userId: string,
  id: string,
  now: number,
): AppResultAsync<void> =>
  write("budget", () =>
    db
      .update(budgets)
      .set({ archivedAt: now })
      .where(and(eq(budgets.id, id), eq(budgets.userId, userId)))
      .run(),
  ).map(() => undefined);
