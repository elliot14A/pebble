import type { Budget } from "@/core/budgets/budget";
import type { AppResultAsync } from "@/core/error";
import { type DrizzleD1Database, write } from "@/infra/d1/connection";
import { budgets } from "@/infra/d1/schema";

export const save = (
  db: DrizzleD1Database,
  budget: Budget,
): AppResultAsync<Budget> =>
  write("budget", () =>
    db
      .insert(budgets)
      .values(budget)
      .onConflictDoUpdate({ target: budgets.id, set: budget })
      .run(),
  ).map(() => budget);
