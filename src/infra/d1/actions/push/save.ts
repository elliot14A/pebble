import type { AppResultAsync } from "@/core/error";
import { newId } from "@/core/id";
import { type DrizzleD1Database, write } from "@/infra/d1/connection";
import { pushSubscriptions } from "@/infra/d1/schema";

export const save = (
  db: DrizzleD1Database,
  userId: string,
  endpoint: string,
  now: number,
): AppResultAsync<void> =>
  write("push subscription", () =>
    db
      .insert(pushSubscriptions)
      .values({ id: newId(now), userId, endpoint, createdAt: now })
      .onConflictDoUpdate({
        target: pushSubscriptions.endpoint,
        set: { userId, failedAt: null },
      })
      .run(),
  ).map(() => undefined);
