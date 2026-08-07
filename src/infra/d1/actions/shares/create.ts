import type { AppResultAsync } from "@/core/error";
import type { Share } from "@/core/shares/share";
import { type DrizzleD1Database, write } from "@/infra/d1/connection";
import { shares } from "@/infra/d1/schema";

export const create = (
  db: DrizzleD1Database,
  share: Share,
): AppResultAsync<Share> =>
  write("share", () => db.insert(shares).values(share).run()).map(() => share);
