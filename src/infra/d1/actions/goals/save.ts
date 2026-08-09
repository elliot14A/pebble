import type { AppResultAsync } from "@/core/error";
import type { Goal } from "@/core/goals";
import { type DrizzleD1Database, write } from "@/infra/d1/connection";
import { goals } from "@/infra/d1/schema";

export const save = (db: DrizzleD1Database, goal: Goal): AppResultAsync<Goal> =>
  write("goal", () =>
    db
      .insert(goals)
      .values(goal)
      .onConflictDoUpdate({ target: goals.id, set: goal })
      .run(),
  ).map(() => goal);
