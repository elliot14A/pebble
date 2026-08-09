import type { AppResultAsync } from "@/core/error";
import { newId } from "@/core/id";
import type { Rate } from "@/core/rates";
import { type DrizzleD1Database, write } from "@/infra/d1/connection";
import { fxRates } from "@/infra/d1/schema";

export const save = (
  db: DrizzleD1Database,
  userId: string,
  rate: Rate,
  now: number,
): AppResultAsync<Rate> =>
  write("rate", () =>
    db
      .insert(fxRates)
      .values({
        id: newId(now),
        userId,
        currency: rate.currency,
        rateE8: rate.rateE8,
        effectiveFrom: rate.effectiveFrom,
        note: null,
        createdAt: now,
      })

      .onConflictDoUpdate({
        target: [fxRates.userId, fxRates.currency, fxRates.effectiveFrom],
        set: { rateE8: rate.rateE8 },
      })
      .run(),
  ).map(() => rate);
