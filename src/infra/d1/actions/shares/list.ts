import { desc, eq } from "drizzle-orm";
import type { AppResultAsync } from "@/core/error";
import type { Share } from "@/core/shares/share";
import { type DrizzleD1Database, read } from "@/infra/d1/connection";
import { shares } from "@/infra/d1/schema";

export const list = (
  db: DrizzleD1Database,
  userId: string,
): AppResultAsync<ReadonlyArray<Share>> =>
  read("shares", () =>
    db
      .select()
      .from(shares)
      .where(eq(shares.userId, userId))
      .orderBy(desc(shares.createdAt)),
  );
