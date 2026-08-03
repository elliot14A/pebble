import { type DrizzleD1Database, drizzle } from "drizzle-orm/d1";
import { ResultAsync } from "neverthrow";
import { type AppResultAsync, appError, StorageErrorCode } from "@/core/error";

export type { DrizzleD1Database };

export const connect = (binding: D1Database): DrizzleD1Database =>
  drizzle(binding);

export const read = <T>(
  what: string,
  query: () => Promise<T>,
): AppResultAsync<T> =>
  ResultAsync.fromPromise(query(), (cause) =>
    appError(StorageErrorCode.READ_FAILED, `could not read ${what}`, {
      cause,
      meta: { what },
    }),
  );

export const write = <T>(
  what: string,
  query: () => Promise<T>,
): AppResultAsync<T> =>
  ResultAsync.fromPromise(query(), (cause) =>
    appError(StorageErrorCode.WRITE_FAILED, `could not write ${what}`, {
      cause,
      meta: { what },
    }),
  );
