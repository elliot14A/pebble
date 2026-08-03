import { and, eq } from "drizzle-orm";
import type { AppResultAsync } from "@/core/error";
import { type DrizzleD1Database, write } from "@/infra/d1/connection";
import { fxRates } from "@/infra/d1/schema";

export const remove = (
  db: DrizzleD1Database,
  userId: string,
  currency: string,
): AppResultAsync<void> =>
  write("rates", () =>
    db
      .delete(fxRates)
      .where(and(eq(fxRates.userId, userId), eq(fxRates.currency, currency)))
      .run(),
  ).map(() => undefined);
