import { visible as listCategories } from "@/app/categories/list";
import type { Account } from "@/core/accounts/account";
import type { Category } from "@/core/categories/category";
import type { AppResultAsync } from "@/core/error";
import { list as listAccounts } from "@/infra/d1/actions/accounts";
import { list as listMerchants } from "@/infra/d1/actions/merchants";
import { list as listRates } from "@/infra/d1/actions/rates";
import { frequentCategories } from "@/infra/d1/actions/transactions";
import type { DrizzleD1Database } from "@/infra/d1/connection";

export type QuickAddData = Readonly<{
  accounts: ReadonlyArray<Account>;

  categories: ReadonlyArray<Category>;
  defaultAccountId: string | null;

  rates: Readonly<Record<string, number>>;
  merchants: ReadonlyArray<
    Readonly<{ name: string; categoryId: string | null }>
  >;
}>;

const FREQUENT = 12;
const MERCHANTS = 24;

export const quickAdd = (
  db: DrizzleD1Database,
  userId: string,
  today: string,
): AppResultAsync<QuickAddData> =>
  listAccounts(db, userId).andThen((accounts) =>
    listCategories(db, userId).andThen((categories) =>
      frequentCategories(db, userId, FREQUENT).andThen((frequent) =>
        listRates(db, userId).andThen((rates) =>
          listMerchants(db, userId, MERCHANTS).map((merchants) => {
            const rank = new Map(frequent.map((id, index) => [id, index]));
            const ordered = [...categories]
              .filter((category) => category.archivedAt === null)
              .sort((a, b) => {
                const left = rank.get(a.id) ?? Number.MAX_SAFE_INTEGER;
                const right = rank.get(b.id) ?? Number.MAX_SAFE_INTEGER;
                return left === right
                  ? a.sortOrder - b.sortOrder
                  : left - right;
              });
            const open = accounts.filter(
              (account) => account.archivedAt === null,
            );

            const current: Record<string, number> = {};
            for (const rate of rates) {
              if (rate.effectiveFrom > today) continue;
              current[rate.currency] = rate.rateE8;
            }

            return {
              accounts: open,
              categories: ordered,
              defaultAccountId: open[0]?.id ?? null,
              rates: current,
              merchants: merchants.map((merchant) => ({
                name: merchant.displayName,
                categoryId: merchant.defaultCategoryId,
              })),
            };
          }),
        ),
      ),
    ),
  );
