import { asc, eq } from "drizzle-orm";
import type { AppResultAsync } from "@/core/error";
import type { Rate } from "@/core/rates";
import { type DrizzleD1Database, read } from "@/infra/d1/connection";
import { fxRates } from "@/infra/d1/schema";

export const list = (
  db: DrizzleD1Database,
  userId: string,
): AppResultAsync<ReadonlyArray<Rate>> =>
  read("rates", () =>
    db
      .select()
      .from(fxRates)
      .where(eq(fxRates.userId, userId))
      .orderBy(asc(fxRates.currency), asc(fxRates.effectiveFrom)),
  ).map((rows) =>
    rows.map((row) => ({
      currency: row.currency,
      rateE8: row.rateE8,
      effectiveFrom: row.effectiveFrom,
    })),
  );
