import { and, eq } from "drizzle-orm";
import type { AppResultAsync } from "@/core/error";
import type { Recurring } from "@/core/recurring/schedule";
import { type DrizzleD1Database, read } from "@/infra/d1/connection";
import { recurring } from "@/infra/d1/schema";

export const fetch = (
  db: DrizzleD1Database,
  userId: string,
  id: string,
): AppResultAsync<Recurring | null> =>
  read("recurring", () =>
    db
      .select()
      .from(recurring)
      .where(and(eq(recurring.id, id), eq(recurring.userId, userId)))
      .limit(1),
  ).map((rows) => rows[0] ?? null);
