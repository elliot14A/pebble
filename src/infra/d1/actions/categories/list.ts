import { asc, eq, isNull, or } from "drizzle-orm";
import {
  type Category,
  type CategoryKind,
  isGlyph,
  type Tint,
} from "@/core/categories";
import type { AppResultAsync } from "@/core/error";
import { type DrizzleD1Database, read } from "@/infra/d1/connection";
import { categories } from "@/infra/d1/schema";

export type CategoryRow = typeof categories.$inferSelect;

export const toCategory = (row: CategoryRow): Category => ({
  id: row.id,
  ownerId: row.ownerId,
  name: row.name,
  slug: row.slug,
  kind: row.kind as CategoryKind,
  glyph: isGlyph(row.glyph) ? row.glyph : "dots",
  tint: row.tint as Tint,
  parentId: row.parentId,
  sortOrder: row.sortOrder,
  archivedAt: row.archivedAt,
});

export const list = (
  db: DrizzleD1Database,
  userId: string,
): AppResultAsync<ReadonlyArray<Category>> =>
  read("categories", () =>
    db
      .select()
      .from(categories)
      .where(or(isNull(categories.ownerId), eq(categories.ownerId, userId)))
      .orderBy(asc(categories.sortOrder), asc(categories.name)),
  ).map((rows) => rows.map(toCategory));
