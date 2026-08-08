import { and, eq } from "drizzle-orm";
import type { AppResultAsync } from "@/core/error";
import { type DrizzleD1Database, write } from "@/infra/d1/connection";
import { categories } from "@/infra/d1/schema";

export const remove = (
  db: DrizzleD1Database,
  userId: string,
  id: string,
): AppResultAsync<void> =>
  write("category", () =>
    db
      .delete(categories)
      .where(and(eq(categories.id, id), eq(categories.ownerId, userId)))
      .run(),
  ).map(() => undefined);
