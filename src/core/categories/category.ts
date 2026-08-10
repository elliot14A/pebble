export const CATEGORY_KINDS = ["income", "expense", "both"] as const;
export type CategoryKind = (typeof CATEGORY_KINDS)[number];

export const GLYPHS = [
  "food",
  "fuel",
  "groceries",
  "home",
  "bolt",
  "bag",
  "plane",
  "play",
  "health",
  "book",
  "trend",
  "salary",
  "swap",
  "dots",
  "receipt",
  "users",
  "target",
  "coins",
] as const;
export type Glyph = (typeof GLYPHS)[number];

export const isGlyph = (value: string): value is Glyph =>
  (GLYPHS as ReadonlyArray<string>).includes(value);

export const TINTS = ["money", "warn", "move", "over", "flat"] as const;
export type Tint = (typeof TINTS)[number];

export type Category = Readonly<{
  id: string;
  ownerId: string | null;
  name: string;
  slug: string;
  kind: CategoryKind;
  glyph: Glyph;
  tint: Tint;
  parentId: string | null;
  sortOrder: number;
  archivedAt: number | null;
}>;

export const isKind = (value: string): value is CategoryKind =>
  (CATEGORY_KINDS as ReadonlyArray<string>).includes(value);

export const isTint = (value: string): value is Tint =>
  (TINTS as ReadonlyArray<string>).includes(value);

export const MAX_NAME = 24;

export const slugFor = (name: string): string =>
  name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
