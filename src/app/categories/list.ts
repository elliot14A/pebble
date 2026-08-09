import type { Category } from "@/core/categories";
import type { AppResultAsync } from "@/core/error";
import { list, listHidden } from "@/infra/d1/actions/categories";
import { count } from "@/infra/d1/actions/transactions";
import type { DrizzleD1Database } from "@/infra/d1/connection";

export type CategoryLine = Readonly<{
  category: Category;
  own: boolean;
  hidden: boolean;
}>;

export type CategoryBoard = Readonly<{
  shown: ReadonlyArray<CategoryLine>;
  hidden: ReadonlyArray<CategoryLine>;
}>;

export const board = (
  db: DrizzleD1Database,
  userId: string,
): AppResultAsync<CategoryBoard> =>
  list(db, userId).andThen((categories) =>
    listHidden(db, userId).map((hiddenIds) => {
      const lines = categories
        .filter((category) => category.archivedAt === null)
        .map((category) => ({
          category,
          own: category.ownerId === userId,
          hidden: hiddenIds.has(category.id),
        }));

      return {
        shown: lines.filter((line) => !line.hidden),
        hidden: lines.filter((line) => line.hidden),
      };
    }),
  );

export const visible = (
  db: DrizzleD1Database,
  userId: string,
): AppResultAsync<ReadonlyArray<Category>> =>
  list(db, userId).andThen((categories) =>
    listHidden(db, userId).map((hiddenIds) =>
      categories.filter(
        (category) =>
          category.archivedAt === null && !hiddenIds.has(category.id),
      ),
    ),
  );

export const usage = (
  db: DrizzleD1Database,
  userId: string,
  categoryId: string,
): AppResultAsync<number> => count(db, { userId, categoryId });
