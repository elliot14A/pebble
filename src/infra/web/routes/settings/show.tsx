import type { Context } from "hono";
import { visible as listCategories } from "@/app/categories";
import { listInUse } from "@/app/rates";
import { list as listAccounts } from "@/infra/d1/actions/accounts";
import { list as listGoals } from "@/infra/d1/actions/goals";
import { list as listRules } from "@/infra/d1/actions/recurring";
import { list as listShares } from "@/infra/d1/actions/shares";
import { list as listUsers } from "@/infra/d1/actions/users";
import type { Env } from "@/infra/web/context";
import { errorToHttp } from "@/infra/web/errorMapper";
import { SettingsPage } from "@/infra/web/views/pages/settings";

export async function show(c: Context<Env>) {
  const ctx = c.get("ctx");

  const data = await listAccounts(ctx.db, ctx.user.id).andThen((accounts) =>
    listInUse(ctx.db, ctx.user.id, ctx.baseCurrency).andThen((currencies) =>
      listUsers(ctx.db).andThen((users) =>
        listShares(ctx.db, ctx.user.id).andThen((shares) =>
          listCategories(ctx.db, ctx.user.id).andThen((categories) =>
            listRules(ctx.db, ctx.user.id).andThen((rules) =>
              listGoals(ctx.db, ctx.user.id).map((goalList) => ({
                accounts,
                currencies,
                users,
                shares,
                categories,
                rules,
                goalList,
              })),
            ),
          ),
        ),
      ),
    ),
  );

  if (data.isErr()) {
    const { status, message } = errorToHttp(data.error);
    return c.text(message, status);
  }

  return c.html(
    <SettingsPage
      user={ctx.user}
      currencyCount={data.value.currencies.length}
      userCount={data.value.users.length}
      shareCount={data.value.shares.filter((s) => s.revokedAt === null).length}
      categoryCount={data.value.categories.length}
      repeatingCount={data.value.rules.length}
      goalCount={data.value.goalList.length}
      notice={c.req.query("saved") ?? null}
    />,
  );
}
