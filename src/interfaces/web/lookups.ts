import type { AppResultAsync } from "@/core/error";
import { list as listAccounts } from "@/infra/d1/actions/accounts";
import { list as listCategories } from "@/infra/d1/actions/categories";
import type { Context } from "@/interfaces/web/context";
import type { LedgerLookups } from "@/interfaces/web/views/partials/ledgerRow";

export const lookups = (ctx: Context): AppResultAsync<LedgerLookups> =>
  listCategories(ctx.db, ctx.user.id).andThen((categories) =>
    listAccounts(ctx.db, ctx.user.id).map((accounts) => ({
      categories: new Map(categories.map((c) => [c.id, c])),
      accounts: new Map(accounts.map((a) => [a.id, a])),
      baseCurrency: ctx.baseCurrency,
    })),
  );
