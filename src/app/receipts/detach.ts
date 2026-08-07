import { err, ok, ResultAsync } from "neverthrow";
import {
  type AppResult,
  type AppResultAsync,
  appError,
  ResourceErrorCode,
} from "@/core/error";
import { fetch as fetchReceipt, remove } from "@/infra/d1/actions/receipts";
import type { DrizzleD1Database } from "@/infra/d1/connection";
import { removeReceipt } from "@/infra/r2/receipts";

export const detach = (
  db: DrizzleD1Database,
  bucket: R2Bucket,
  userId: string,
  id: string,
): AppResultAsync<void> => {
  const run = async (): Promise<AppResult<void>> => {
    const found = await fetchReceipt(db, userId, id);
    if (found.isErr()) return err(found.error);
    if (found.value === null) {
      return err(
        appError(ResourceErrorCode.NOT_FOUND, "That receipt is not here."),
      );
    }

    const gone = await removeReceipt(bucket, found.value.objectKey);
    if (gone.isErr()) return err(gone.error);

    const cleared = await remove(db, userId, id);
    return cleared.isErr() ? err(cleared.error) : ok(undefined);
  };

  return new ResultAsync(run());
};
