import { and, eq } from "drizzle-orm";
import type { AppResultAsync } from "@/core/error";
import type { Goal } from "@/core/goals";
import { type DrizzleD1Database, read } from "@/infra/d1/connection";
import { goals } from "@/infra/d1/schema";

export const fetch = (
  db: DrizzleD1Database,
  userId: string,
  id: string,
): AppResultAsync<Goal | null> =>
  read("goal", () =>
    db
      .select()
      .from(goals)
      .where(and(eq(goals.id, id), eq(goals.userId, userId)))
      .limit(1),
  ).map((rows) => rows[0] ?? null);
