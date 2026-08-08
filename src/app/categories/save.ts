import { err, ResultAsync } from "neverthrow";
import {
  type Category,
  type CategoryKind,
  type Glyph,
  isGlyph,
  isKind,
  isTint,
  MAX_NAME,
  slugFor,
  type Tint,
} from "@/core/categories/category";
import {
  type AppResult,
  type AppResultAsync,
  appError,
  ResourceErrorCode,
  ValidationErrorCode,
} from "@/core/error";
import { newId } from "@/core/id";
import {
  fetch as fetchCategory,
  list as listCategories,
  save as saveCategory,
} from "@/infra/d1/actions/categories";
import type { DrizzleD1Database } from "@/infra/d1/connection";

export type CategoryInput = Readonly<{
  userId: string;
  id: string | null;
  name: string;
  kind: string;
  glyph: string;
  tint: string;
  now: number;
}>;

const invalid = (message: string) =>
  appError(ValidationErrorCode.INVALID_INPUT, message);

export const save = (
  db: DrizzleD1Database,
  input: CategoryInput,
): AppResultAsync<Category> => {
  const run = async (): Promise<AppResult<Category>> => {
    const name = input.name.trim().replace(/\s+/g, " ");
    if (name === "") return err(invalid("Give the category a name."));
    if (name.length > MAX_NAME) {
      return err(invalid(`Keep the name under ${MAX_NAME} characters.`));
    }
    if (!isKind(input.kind)) return err(invalid("Pick what it is for."));

    const glyph: Glyph = isGlyph(input.glyph) ? input.glyph : "dots";
    const tint: Tint = isTint(input.tint) ? input.tint : "money";
    const kind: CategoryKind = input.kind;

    const all = await listCategories(db, input.userId);
    if (all.isErr()) return err(all.error);

    const clash = all.value.find(
      (category) =>
        category.id !== input.id &&
        category.name.toLowerCase() === name.toLowerCase(),
    );
    if (clash !== undefined) {
      return err(
        appError(ResourceErrorCode.CONFLICT, `${clash.name} already exists.`, {
          meta: { name },
        }),
      );
    }

    if (input.id === null) {
      return saveCategory(db, {
        id: newId(input.now),
        ownerId: input.userId,
        name,
        slug: slugFor(name),
        kind,
        glyph,
        tint,
        parentId: null,
        sortOrder: all.value.length + 1,
        archivedAt: null,
      });
    }

    const existing = await fetchCategory(db, input.userId, input.id);
    if (existing.isErr()) return err(existing.error);
    if (existing.value === null) {
      return err(
        appError(ResourceErrorCode.NOT_FOUND, "That category is not here."),
      );
    }
    if (existing.value.ownerId !== input.userId) {
      return err(
        appError(
          ResourceErrorCode.FORBIDDEN,
          "The built-in categories are shared, so they cannot be renamed. Hide it and make your own.",
        ),
      );
    }

    return saveCategory(db, {
      ...existing.value,
      name,
      slug: slugFor(name),
      kind,
      glyph,
      tint,
    });
  };

  return new ResultAsync(run());
};
