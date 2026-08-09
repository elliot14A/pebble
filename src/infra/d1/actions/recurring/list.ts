import { and, asc, eq, isNull, lte } from "drizzle-orm";
import type { AppResultAsync } from "@/core/error";
import type { Recurring } from "@/core/recurring";
import { type DrizzleD1Database, read } from "@/infra/d1/connection";
import { recurring } from "@/infra/d1/schema";

export const list = (
  db: DrizzleD1Database,
  userId: string,
): AppResultAsync<ReadonlyArray<Recurring>> =>
  read("recurring", () =>
    db
      .select()
      .from(recurring)
      .where(and(eq(recurring.userId, userId), isNull(recurring.archivedAt)))
      .orderBy(asc(recurring.nextOn)),
  );

/** Everyone's, because the scheduled run has nobody signed in. */
export const listDue = (
  db: DrizzleD1Database,
  today: string,
): AppResultAsync<ReadonlyArray<Recurring>> =>
  read("recurring", () =>
    db
      .select()
      .from(recurring)
      .where(and(isNull(recurring.archivedAt), lte(recurring.nextOn, today)))
      .orderBy(asc(recurring.nextOn)),
  );
