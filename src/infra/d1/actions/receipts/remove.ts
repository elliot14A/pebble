import { and, eq } from "drizzle-orm";
import type { AppResultAsync } from "@/core/error";
import { type DrizzleD1Database, write } from "@/infra/d1/connection";
import { receipts } from "@/infra/d1/schema";

export const remove = (
  db: DrizzleD1Database,
  userId: string,
  id: string,
): AppResultAsync<void> =>
  write("receipt", () =>
    db
      .delete(receipts)
      .where(and(eq(receipts.id, id), eq(receipts.userId, userId)))
      .run(),
  ).map(() => undefined);
