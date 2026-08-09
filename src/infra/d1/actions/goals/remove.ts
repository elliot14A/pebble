import { and, eq } from "drizzle-orm";
import type { AppResultAsync } from "@/core/error";
import { type DrizzleD1Database, write } from "@/infra/d1/connection";
import { goals } from "@/infra/d1/schema";

export const remove = (
  db: DrizzleD1Database,
  userId: string,
  id: string,
  now: number,
): AppResultAsync<void> =>
  write("goal", () =>
    db
      .update(goals)
      .set({ archivedAt: now })
      .where(and(eq(goals.id, id), eq(goals.userId, userId)))
      .run(),
  ).map(() => undefined);
