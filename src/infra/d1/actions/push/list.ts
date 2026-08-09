import { eq, isNull } from "drizzle-orm";
import type { AppResultAsync } from "@/core/error";
import { type DrizzleD1Database, read } from "@/infra/d1/connection";
import { pushSubscriptions } from "@/infra/d1/schema";

export type Subscription = typeof pushSubscriptions.$inferSelect;

export const list = (
  db: DrizzleD1Database,
): AppResultAsync<ReadonlyArray<Subscription>> =>
  read("push subscriptions", () =>
    db
      .select()
      .from(pushSubscriptions)
      .where(isNull(pushSubscriptions.failedAt)),
  );

export const listFor = (
  db: DrizzleD1Database,
  userId: string,
): AppResultAsync<ReadonlyArray<Subscription>> =>
  read("push subscriptions", () =>
    db
      .select()
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.userId, userId)),
  );
