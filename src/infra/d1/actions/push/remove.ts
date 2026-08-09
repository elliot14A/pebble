import { eq } from "drizzle-orm";
import type { AppResultAsync } from "@/core/error";
import { type DrizzleD1Database, write } from "@/infra/d1/connection";
import { pushSubscriptions } from "@/infra/d1/schema";

export const remove = (
  db: DrizzleD1Database,
  endpoint: string,
): AppResultAsync<void> =>
  write("push subscription", () =>
    db
      .delete(pushSubscriptions)
      .where(eq(pushSubscriptions.endpoint, endpoint))
      .run(),
  ).map(() => undefined);
