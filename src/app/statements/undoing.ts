import type { AppResultAsync } from "@/core/error";
import {
  batches,
  type ImportBatch,
  removeBatch,
} from "@/infra/d1/actions/transactions";
import type { DrizzleD1Database } from "@/infra/d1/connection";

export type { ImportBatch };

export const history = (
  db: DrizzleD1Database,
  userId: string,
): AppResultAsync<ReadonlyArray<ImportBatch>> => batches(db, userId);

export const undo = (
  db: DrizzleD1Database,
  userId: string,
  accountId: string,
  broughtAt: number,
): AppResultAsync<number> => removeBatch(db, userId, accountId, broughtAt);
