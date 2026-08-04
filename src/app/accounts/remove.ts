import { err, ok, ResultAsync } from "neverthrow";
import type { AppResult, AppResultAsync } from "@/core/error";
import { archive, remove as deleteAccount } from "@/infra/d1/actions/accounts";
import { countForAccount } from "@/infra/d1/actions/transactions";
import type { DrizzleD1Database } from "@/infra/d1/connection";

export type RemoveOutcome = "deleted" | "archived";

export const remove = (
  db: DrizzleD1Database,
  userId: string,
  id: string,
  now: number,
): AppResultAsync<RemoveOutcome> => {
  const run = async (): Promise<AppResult<RemoveOutcome>> => {
    const used = await countForAccount(db, userId, id);
    if (used.isErr()) return err(used.error);

    if (used.value === 0) {
      const done = await deleteAccount(db, userId, id);
      return done.isErr() ? err(done.error) : ok("deleted");
    }

    const done = await archive(db, userId, id, now);
    return done.isErr() ? err(done.error) : ok("archived");
  };

  return new ResultAsync(run());
};
