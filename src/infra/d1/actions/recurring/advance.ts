import { and, eq } from "drizzle-orm";
import type { AppResultAsync } from "@/core/error";
import { type DrizzleD1Database, write } from "@/infra/d1/connection";
import { recurring } from "@/infra/d1/schema";

export const advance = (
  db: DrizzleD1Database,
  id: string,
  nextOn: string,
  lastRunOn: string,
): AppResultAsync<void> =>
  write("recurring", () =>
    db
      .update(recurring)
      .set({ nextOn, lastRunOn })
      .where(eq(recurring.id, id))
      .run(),
  ).map(() => undefined);

export const remove = (
  db: DrizzleD1Database,
  userId: string,
  id: string,
  now: number,
): AppResultAsync<void> =>
  write("recurring", () =>
    db
      .update(recurring)
      .set({ archivedAt: now })
      .where(and(eq(recurring.id, id), eq(recurring.userId, userId)))
      .run(),
  ).map(() => undefined);
