import type { AppResultAsync } from "@/core/error";
import type { Receipt } from "@/core/receipts/receipt";
import { type DrizzleD1Database, write } from "@/infra/d1/connection";
import { receipts } from "@/infra/d1/schema";

export const create = (
  db: DrizzleD1Database,
  receipt: Receipt,
): AppResultAsync<Receipt> =>
  write("receipt", () => db.insert(receipts).values(receipt).run()).map(
    () => receipt,
  );
