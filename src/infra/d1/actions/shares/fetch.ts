import { eq } from "drizzle-orm";
import type { AppResultAsync } from "@/core/error";
import type { Share } from "@/core/shares/share";
import type { User } from "@/core/users/user";
import { toUser } from "@/infra/d1/actions/users/list";
import { type DrizzleD1Database, read } from "@/infra/d1/connection";
import { shares, users } from "@/infra/d1/schema";

export type SharedBy = Readonly<{ share: Share; owner: User }>;

export const fetchByToken = (
  db: DrizzleD1Database,
  token: string,
): AppResultAsync<SharedBy | null> =>
  read("share", () =>
    db
      .select({ share: shares, owner: users })
      .from(shares)
      .innerJoin(users, eq(shares.userId, users.id))
      .where(eq(shares.token, token))
      .limit(1),
  ).map((rows) => {
    const row = rows[0];
    if (row === undefined) return null;
    return { share: row.share, owner: toUser(row.owner) };
  });
