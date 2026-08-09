import type { Category } from "@/core/categories";
import type { AppResultAsync } from "@/core/error";
import { type DrizzleD1Database, write } from "@/infra/d1/connection";
import { categories } from "@/infra/d1/schema";

export const save = (
  db: DrizzleD1Database,
  category: Category,
): AppResultAsync<Category> =>
  write("category", () =>
    db
      .insert(categories)
      .values(category)
      .onConflictDoUpdate({ target: categories.id, set: category })
      .run(),
  ).map(() => category);
