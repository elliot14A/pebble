import { ResultAsync } from "neverthrow";
import { type AppResultAsync, appError, StorageErrorCode } from "@/core/error";

const failed = (what: string) => (cause: unknown) =>
  appError(StorageErrorCode.WRITE_FAILED, `Could not ${what} the receipt.`, {
    cause,
  });

export const putReceipt = (
  bucket: R2Bucket,
  key: string,
  body: ArrayBuffer,
  contentType: string,
): AppResultAsync<void> =>
  ResultAsync.fromPromise(
    bucket.put(key, body, { httpMetadata: { contentType } }),
    failed("store"),
  ).map(() => undefined);

export const getReceipt = (
  bucket: R2Bucket,
  key: string,
): AppResultAsync<R2ObjectBody | null> =>
  ResultAsync.fromPromise(bucket.get(key), failed("read"));

export const removeReceipt = (
  bucket: R2Bucket,
  key: string,
): AppResultAsync<void> =>
  ResultAsync.fromPromise(bucket.delete(key), failed("remove")).map(
    () => undefined,
  );
