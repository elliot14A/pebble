import { and, eq, isNotNull } from "drizzle-orm";
import type { AppResultAsync } from "@/core/error";
import { newId } from "@/core/id";
import { type DrizzleD1Database, read, write } from "@/infra/d1/connection";
import { categoryPrefs } from "@/infra/d1/schema";

export const listHidden = (
  db: DrizzleD1Database,
  userId: string,
): AppResultAsync<ReadonlySet<string>> =>
  read("category prefs", () =>
    db
      .select({ categoryId: categoryPrefs.categoryId })
      .from(categoryPrefs)
      .where(
        and(
          eq(categoryPrefs.userId, userId),
          isNotNull(categoryPrefs.hiddenAt),
        ),
      ),
  ).map((rows) => new Set(rows.map((row) => row.categoryId)));

export const hide = (
  db: DrizzleD1Database,
  userId: string,
  categoryId: string,
  now: number,
): AppResultAsync<void> =>
  write("category prefs", () =>
    db
      .insert(categoryPrefs)
      .values({ id: newId(now), userId, categoryId, hiddenAt: now })
      .onConflictDoUpdate({
        target: [categoryPrefs.userId, categoryPrefs.categoryId],
        set: { hiddenAt: now },
      })
      .run(),
  ).map(() => undefined);

export const show = (
  db: DrizzleD1Database,
  userId: string,
  categoryId: string,
): AppResultAsync<void> =>
  write("category prefs", () =>
    db
      .delete(categoryPrefs)
      .where(
        and(
          eq(categoryPrefs.userId, userId),
          eq(categoryPrefs.categoryId, categoryId),
        ),
      )
      .run(),
  ).map(() => undefined);
