import { and, eq, isNull } from "drizzle-orm";
import type { Budget } from "@/core/budgets";
import type { AppResultAsync } from "@/core/error";
import { type DrizzleD1Database, read } from "@/infra/d1/connection";
import { budgets } from "@/infra/d1/schema";

export const list = (
  db: DrizzleD1Database,
  userId: string,
): AppResultAsync<ReadonlyArray<Budget>> =>
  read("budgets", () =>
    db
      .select()
      .from(budgets)
      .where(and(eq(budgets.userId, userId), isNull(budgets.archivedAt))),
  );
