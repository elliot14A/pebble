import type { Result, ResultAsync } from "neverthrow";

export const ValidationErrorCode = {
  INVALID_INPUT: "VAL_ERR_01",
} as const;

export const ResourceErrorCode = {
  NOT_FOUND: "RES_ERR_01",
  CONFLICT: "RES_ERR_02",
  FORBIDDEN: "RES_ERR_03",
} as const;

export const MoneyErrorCode = {
  UNKNOWN_CURRENCY: "MONEY_ERR_01",
  CURRENCY_MISMATCH: "MONEY_ERR_02",
  INVALID_AMOUNT: "MONEY_ERR_03",
  MISSING_RATE: "MONEY_ERR_04",
} as const;

export const StorageErrorCode = {
  READ_FAILED: "STORAGE_ERR_01",
  WRITE_FAILED: "STORAGE_ERR_02",
} as const;

export const SystemErrorCode = {
  INTERNAL: "SYS_ERR_01",
} as const;

type CodeOf<T> = T[keyof T];

export type AppErrorCode =
  | CodeOf<typeof ValidationErrorCode>
  | CodeOf<typeof ResourceErrorCode>
  | CodeOf<typeof MoneyErrorCode>
  | CodeOf<typeof StorageErrorCode>
  | CodeOf<typeof SystemErrorCode>;

export type AppError = Readonly<{
  code: AppErrorCode;
  message: string;
  cause?: unknown;
  meta?: Readonly<Record<string, unknown>>;
}>;

export type AppResult<T> = Result<T, AppError>;
export type AppResultAsync<T> = ResultAsync<T, AppError>;

type ErrorInfo = Readonly<{
  cause?: unknown;
  meta?: Readonly<Record<string, unknown>>;
}>;

export function appError(
  code: AppErrorCode,
  message: string,
  info?: ErrorInfo,
): AppError {
  return {
    code,
    message,
    ...(info?.cause !== undefined ? { cause: info.cause } : {}),
    ...(info?.meta !== undefined ? { meta: info.meta } : {}),
  };
}
