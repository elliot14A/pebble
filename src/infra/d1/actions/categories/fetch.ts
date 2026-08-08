import { and, eq, isNull, or } from "drizzle-orm";
import type { Category } from "@/core/categories/category";
import type { AppResultAsync } from "@/core/error";
import { toCategory } from "@/infra/d1/actions/categories/list";
import { type DrizzleD1Database, read } from "@/infra/d1/connection";
import { categories } from "@/infra/d1/schema";

export const fetch = (
  db: DrizzleD1Database,
  userId: string,
  id: string,
): AppResultAsync<Category | null> =>
  read("category", () =>
    db
      .select()
      .from(categories)
      .where(
        and(
          eq(categories.id, id),
          or(isNull(categories.ownerId), eq(categories.ownerId, userId)),
        ),
      )
      .limit(1),
  ).map((rows) => (rows[0] === undefined ? null : toCategory(rows[0])));
