import { err, ok, ResultAsync } from "neverthrow";
import {
  type AppResult,
  type AppResultAsync,
  appError,
  ResourceErrorCode,
} from "@/core/error";
import {
  fetch as fetchCategory,
  hide,
  remove as removeCategory,
} from "@/infra/d1/actions/categories";
import { count } from "@/infra/d1/actions/transactions";
import type { DrizzleD1Database } from "@/infra/d1/connection";

export type Removal = "deleted" | "hidden";

export const remove = (
  db: DrizzleD1Database,
  userId: string,
  id: string,
  now: number,
): AppResultAsync<Removal> => {
  const run = async (): Promise<AppResult<Removal>> => {
    const found = await fetchCategory(db, userId, id);
    if (found.isErr()) return err(found.error);
    if (found.value === null) {
      return err(
        appError(ResourceErrorCode.NOT_FOUND, "That category is not here."),
      );
    }

    const used = await count(db, { userId, categoryId: id });
    if (used.isErr()) return err(used.error);

    if (used.value > 0 || found.value.ownerId !== userId) {
      const hidden = await hide(db, userId, id, now);
      return hidden.isErr() ? err(hidden.error) : ok("hidden");
    }

    const gone = await removeCategory(db, userId, id);
    return gone.isErr() ? err(gone.error) : ok("deleted");
  };

  return new ResultAsync(run());
};
