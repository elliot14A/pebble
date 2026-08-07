export type Receipt = Readonly<{
  id: string;
  userId: string;
  transactionId: string | null;

  objectKey: string;
  contentType: string;
  byteSize: number;

  readAmountText: string | null;
  readName: string | null;
  readOn: string | null;
  readAt: number | null;

  createdAt: number;
}>;

export const MAX_BYTES = 6 * 1024 * 1024;

export const ALLOWED = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
]);

export const keyFor = (userId: string, id: string): string =>
  `u/${userId}/${id}`;
