import { and, eq } from "drizzle-orm";
import type { AppResultAsync } from "@/core/error";
import type { Receipt } from "@/core/receipts/receipt";
import { type DrizzleD1Database, read } from "@/infra/d1/connection";
import { receipts } from "@/infra/d1/schema";

export const fetch = (
  db: DrizzleD1Database,
  userId: string,
  id: string,
): AppResultAsync<Receipt | null> =>
  read("receipt", () =>
    db
      .select()
      .from(receipts)
      .where(and(eq(receipts.id, id), eq(receipts.userId, userId)))
      .limit(1),
  ).map((rows) => rows[0] ?? null);

export const forTransaction = (
  db: DrizzleD1Database,
  userId: string,
  transactionId: string,
): AppResultAsync<ReadonlyArray<Receipt>> =>
  read("receipts", () =>
    db
      .select()
      .from(receipts)
      .where(
        and(
          eq(receipts.userId, userId),
          eq(receipts.transactionId, transactionId),
        ),
      ),
  );
