import { err, ok, ResultAsync } from "neverthrow";
import type { AppResult, AppResultAsync } from "@/core/error";
import { list as listSubscriptions, remove } from "@/infra/d1/actions/push";
import { listDue } from "@/infra/d1/actions/recurring";
import type { DrizzleD1Database } from "@/infra/d1/connection";
import { notify, type VapidKeys } from "@/infra/push";

export type Nudged = Readonly<{ sent: number; dropped: number }>;

/**
 * One wake-up per device that has a bill standing. The push carries nothing;
 * the service worker asks pebble what to say once it is awake.
 */
export const remind = (
  db: DrizzleD1Database,
  keys: VapidKeys,
  today: string,
  now: number,
): AppResultAsync<Nudged> => {
  const run = async (): Promise<AppResult<Nudged>> => {
    const due = await listDue(db, today);
    if (due.isErr()) return err(due.error);

    const owing = new Set(
      due.value.filter((rule) => rule.kind === "bill").map((r) => r.userId),
    );
    if (owing.size === 0) return ok({ sent: 0, dropped: 0 });

    const devices = await listSubscriptions(db);
    if (devices.isErr()) return err(devices.error);

    let sent = 0;
    let dropped = 0;

    for (const device of devices.value) {
      if (!owing.has(device.userId)) continue;

      const status = await notify(device.endpoint, keys, now);
      if (status.isErr()) continue;

      if (status.value === 404 || status.value === 410) {
        await remove(db, device.endpoint);
        dropped += 1;
        continue;
      }
      if (status.value < 300) sent += 1;
    }

    return ok({ sent, dropped });
  };

  return new ResultAsync(run());
};
