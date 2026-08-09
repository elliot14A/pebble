import { err, ok, ResultAsync } from "neverthrow";
import type { AppResult, AppResultAsync } from "@/core/error";
import { pack, parse } from "@/core/tags";
import {
  fetch as fetchTransaction,
  update,
} from "@/infra/d1/actions/transactions";
import type { DrizzleD1Database } from "@/infra/d1/connection";

export const tag = (
  db: DrizzleD1Database,
  userId: string,
  id: string,
  raw: string,
  now: number,
): AppResultAsync<ReadonlyArray<string>> => {
  const run = async (): Promise<AppResult<ReadonlyArray<string>>> => {
    const found = await fetchTransaction(db, userId, id);
    if (found.isErr()) return err(found.error);

    const tags = parse(raw);
    const saved = await update(db, {
      ...found.value,
      tags: pack(tags),
      updatedAt: now,
    });
    if (saved.isErr()) return err(saved.error);

    return ok(tags);
  };

  return new ResultAsync(run());
};
