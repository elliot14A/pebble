import type { ContentfulStatusCode } from "hono/utils/http-status";
import {
  type AppError,
  type AppErrorCode,
  MoneyErrorCode,
  ResourceErrorCode,
  StorageErrorCode,
  SystemErrorCode,
  ValidationErrorCode,
} from "@/core/error";

const STATUS: Record<AppErrorCode, ContentfulStatusCode> = {
  [ValidationErrorCode.INVALID_INPUT]: 400,
  [ResourceErrorCode.NOT_FOUND]: 404,
  [ResourceErrorCode.CONFLICT]: 409,
  [ResourceErrorCode.FORBIDDEN]: 403,
  [MoneyErrorCode.UNKNOWN_CURRENCY]: 400,
  [MoneyErrorCode.CURRENCY_MISMATCH]: 400,
  [MoneyErrorCode.INVALID_AMOUNT]: 400,
  [MoneyErrorCode.MISSING_RATE]: 400,
  [StorageErrorCode.READ_FAILED]: 503,
  [StorageErrorCode.WRITE_FAILED]: 503,
  [SystemErrorCode.INTERNAL]: 500,
};

export type HttpError = Readonly<{
  status: ContentfulStatusCode;
  message: string;
}>;

export const errorToHttp = (error: AppError): HttpError => ({
  status: STATUS[error.code],

  message:
    error.code === StorageErrorCode.READ_FAILED ||
    error.code === StorageErrorCode.WRITE_FAILED
      ? "Could not reach the database. Your change is saved on this device and will sync."
      : error.message,
});
