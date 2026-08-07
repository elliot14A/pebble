import { err, ok, ResultAsync } from "neverthrow";
import type { Account } from "@/core/accounts/account";
import {
  type Bucket,
  byCategory,
  topWithRest,
  totalOf,
} from "@/core/analytics/summary";
import type { Category } from "@/core/categories/category";
import {
  type AppResult,
  type AppResultAsync,
  appError,
  ResourceErrorCode,
} from "@/core/error";
import { isLive, type Share } from "@/core/shares/share";
import {
  type DayGroup,
  flowMinor,
  groupByDay,
} from "@/core/transactions/balance";
import type { User } from "@/core/users/user";
import { list as listAccounts } from "@/infra/d1/actions/accounts";
import { list as listCategories } from "@/infra/d1/actions/categories";
import { fetchByToken, touch } from "@/infra/d1/actions/shares";
import { list as listTransactions } from "@/infra/d1/actions/transactions";
import type { DrizzleD1Database } from "@/infra/d1/connection";

const TOP_CATEGORIES = 6;
export const REST_KEY = "__rest__";

export type SharedView = Readonly<{
  share: Share;
  owner: User;
  inMinor: number;
  outMinor: number;
  savedMinor: number;
  categories: ReadonlyArray<Bucket>;
  categoryTotal: number;
  days: ReadonlyArray<DayGroup>;
  transactionCount: number;
  categoryMap: ReadonlyMap<string, Category>;
  accountMap: ReadonlyMap<string, Account>;
}>;

const gone = () =>
  appError(
    ResourceErrorCode.NOT_FOUND,
    "This link is not available any more.",
    { meta: { share: true } },
  );

export const view = (
  db: DrizzleD1Database,
  token: string,
  now: number,
): AppResultAsync<SharedView> => {
  const run = async (): Promise<AppResult<SharedView>> => {
    const found = await fetchByToken(db, token);
    if (found.isErr()) return err(found.error);
    if (found.value === null) return err(gone());

    const { share, owner } = found.value;
    if (!isLive(share, now) || owner.status === "disabled") {
      return err(gone());
    }

    const loaded = await listTransactions(db, {
      userId: share.userId,
      from: share.fromDate,
      to: share.toDate,
    }).andThen((entries) =>
      listCategories(db, share.userId).andThen((categories) =>
        listAccounts(db, share.userId).map((accounts) => ({
          entries,
          categories,
          accounts,
        })),
      ),
    );
    if (loaded.isErr()) return err(loaded.error);

    const { entries, categories, accounts } = loaded.value;
    const flow = flowMinor(entries);
    const buckets = topWithRest(byCategory(entries), TOP_CATEGORIES, REST_KEY);

    await touch(db, token, now);

    return ok({
      share,
      owner,
      inMinor: flow.inMinor,
      outMinor: flow.outMinor,
      savedMinor: flow.inMinor - flow.outMinor,
      categories: buckets,
      categoryTotal: totalOf(buckets),
      days: groupByDay(entries),
      transactionCount: entries.length,
      categoryMap: new Map(categories.map((c) => [c.id, c])),
      accountMap: new Map(accounts.map((a) => [a.id, a])),
    });
  };

  return new ResultAsync(run());
};
