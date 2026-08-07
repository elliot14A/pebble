import { err, ok, ResultAsync } from "neverthrow";
import {
  type AppResult,
  type AppResultAsync,
  appError,
  ValidationErrorCode,
} from "@/core/error";
import { newId } from "@/core/id";
import { NOTHING, type Reading } from "@/core/receipts/reading";
import {
  ALLOWED,
  keyFor,
  MAX_BYTES,
  type Receipt,
} from "@/core/receipts/receipt";
import { create } from "@/infra/d1/actions/receipts";
import type { DrizzleD1Database } from "@/infra/d1/connection";
import { type Reader, read } from "@/infra/openrouter/receipt";
import { putReceipt } from "@/infra/r2/receipts";

export type ScanInput = Readonly<{
  userId: string;
  bytes: ArrayBuffer;
  contentType: string;
  today: string;
  now: number;
  model?: string;
}>;

export type Scanned = Readonly<{ receipt: Receipt; reading: Reading }>;

export const scan = (
  db: DrizzleD1Database,
  bucket: R2Bucket,
  reader: Reader,
  input: ScanInput,
): AppResultAsync<Scanned> => {
  const run = async (): Promise<AppResult<Scanned>> => {
    const type = input.contentType.split(";")[0]?.trim().toLowerCase() ?? "";
    if (!ALLOWED.has(type)) {
      return err(
        appError(
          ValidationErrorCode.INVALID_INPUT,
          "A receipt has to be a photo: jpeg, png, webp or heic.",
        ),
      );
    }
    if (input.bytes.byteLength === 0) {
      return err(
        appError(ValidationErrorCode.INVALID_INPUT, "That photo was empty."),
      );
    }
    if (input.bytes.byteLength > MAX_BYTES) {
      return err(
        appError(
          ValidationErrorCode.INVALID_INPUT,
          "That photo is too big. Keep it under 6 MB.",
        ),
      );
    }

    const id = newId(input.now);
    const objectKey = keyFor(input.userId, id);

    const stored = await putReceipt(bucket, objectKey, input.bytes, type);
    if (stored.isErr()) return err(stored.error);

    const seen = await read(
      reader,
      input.bytes,
      type,
      input.today,
      input.model,
    );
    const reading = seen.isOk() ? seen.value : NOTHING;

    const saved = await create(db, {
      id,
      userId: input.userId,
      transactionId: null,
      objectKey,
      contentType: type,
      byteSize: input.bytes.byteLength,
      readAmountText: reading.amountText,
      readName: reading.merchant,
      readOn: reading.occurredOn,
      readAt: seen.isOk() ? input.now : null,
      createdAt: input.now,
    });
    if (saved.isErr()) return err(saved.error);

    return ok({ receipt: saved.value, reading });
  };

  return new ResultAsync(run());
};
