import { and, eq, sql } from "drizzle-orm";
import { errAsync, okAsync } from "neverthrow";
import { type AppResultAsync, appError, ResourceErrorCode } from "@/core/error";
import { newId } from "@/core/id";
import { type Merchant, normalizeMerchant } from "@/core/merchants";
import { toMerchant } from "@/infra/d1/actions/merchants/list";
import { type DrizzleD1Database, read, write } from "@/infra/d1/connection";
import { merchants } from "@/infra/d1/schema";

export const find = (
  db: DrizzleD1Database,
  userId: string,
  name: string,
): AppResultAsync<Merchant | null> =>
  read("merchant", () =>
    db
      .select()
      .from(merchants)
      .where(
        and(
          eq(merchants.userId, userId),
          eq(merchants.normalizedName, normalizeMerchant(name)),
        ),
      )
      .limit(1),
  ).map((rows) => {
    const row = rows[0];
    return row === undefined ? null : toMerchant(row);
  });

export const ensure = (
  db: DrizzleD1Database,
  userId: string,
  name: string,
  now: number,
): AppResultAsync<Merchant> =>
  write("merchant", () =>
    db
      .insert(merchants)
      .values({
        id: newId(now),
        userId,
        normalizedName: normalizeMerchant(name),
        displayName: name.trim(),
        defaultCategoryId: null,
        seenCount: 0,
      })
      .onConflictDoNothing()
      .run(),
  )
    .andThen(() => find(db, userId, name))
    .andThen((merchant) =>
      merchant === null
        ? errAsync(
            appError(
              ResourceErrorCode.CONFLICT,
              "merchant vanished on insert",
              {
                meta: { name },
              },
            ),
          )
        : okAsync(merchant),
    );

export const remember = (
  db: DrizzleD1Database,
  id: string,
  displayName: string,
  categoryId: string | null,
): AppResultAsync<void> =>
  write("merchant", () =>
    db
      .update(merchants)
      .set({
        seenCount: sql`${merchants.seenCount} + 1`,
        displayName: displayName.trim(),
        ...(categoryId === null ? {} : { defaultCategoryId: categoryId }),
      })
      .where(eq(merchants.id, id))
      .run(),
  ).map(() => undefined);
