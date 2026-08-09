import { and, asc, eq, isNull } from "drizzle-orm";
import type { AppResultAsync } from "@/core/error";
import type { Goal } from "@/core/goals";
import { type DrizzleD1Database, read } from "@/infra/d1/connection";
import { goals } from "@/infra/d1/schema";

export const list = (
  db: DrizzleD1Database,
  userId: string,
): AppResultAsync<ReadonlyArray<Goal>> =>
  read("goals", () =>
    db
      .select()
      .from(goals)
      .where(and(eq(goals.userId, userId), isNull(goals.archivedAt)))
      .orderBy(asc(goals.createdAt)),
  );
