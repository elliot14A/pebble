import type { Context } from "hono";
import {
  balances,
  remove as removeAccount,
  save as saveAccount,
} from "@/app/accounts";
import { quickAdd } from "@/app/quickAdd";
import { listInUse } from "@/app/rates";
import { list as listAccounts, restore } from "@/infra/d1/actions/accounts";
import type { Env } from "@/interfaces/web/context";
import { errorToHttp } from "@/interfaces/web/errorMapper";
import { field } from "@/interfaces/web/form";
import { AccountsPage } from "@/interfaces/web/views/pages/accounts";

const back = (c: Context<Env>, params: Record<string, string>) => {
  const query = new URLSearchParams(params).toString();
  return c.redirect(`/accounts${query === "" ? "" : `?${query}`}`, 303);
};

export async function list(c: Context<Env>) {
  const ctx = c.get("ctx");

  const data = await balances(
    ctx.db,
    ctx.user.id,
    ctx.baseCurrency,
    ctx.today,
  ).andThen((withBalances) =>
    listAccounts(ctx.db, ctx.user.id).andThen((all) =>
      listInUse(ctx.db, ctx.user.id, ctx.baseCurrency).andThen((currencies) =>
        quickAdd(ctx.db, ctx.user.id, ctx.today).map((sheet) => ({
          withBalances,
          all,
          currencies,
          sheet,
        })),
      ),
    ),
  );

  if (data.isErr()) {
    const { status, message } = errorToHttp(data.error);
    return c.text(message, status);
  }

  return c.html(
    <AccountsPage
      accounts={data.value.withBalances.filter(
        (entry) => entry.account.archivedAt === null,
      )}
      archived={data.value.all.filter((account) => account.archivedAt !== null)}
      currencies={[
        ctx.baseCurrency,
        ...data.value.currencies.map((entry) => entry.currency),
      ]}
      baseCurrency={ctx.baseCurrency}
      editing={c.req.query("edit") ?? null}
      message={c.req.query("saved") ?? null}
      error={c.req.query("error") ?? null}
      quickAdd={{
        ...data.value.sheet,
        baseCurrency: ctx.baseCurrency,
        today: ctx.today,
      }}
    />,
  );
}

export async function save(c: Context<Env>) {
  const ctx = c.get("ctx");
  const form = await c.req.formData();

  const saved = await saveAccount(
    ctx.db,
    {
      userId: ctx.user.id,
      id: field(form, "id") === "" ? null : field(form, "id"),
      name: field(form, "name"),
      kind: field(form, "kind"),
      currency: field(form, "currency"),
      openingText: field(form, "openingText"),
    },
    ctx.now,
  );

  return saved.isErr()
    ? back(c, { error: errorToHttp(saved.error).message })
    : back(c, { saved: `${saved.value.name} saved.` });
}

export async function remove(c: Context<Env>) {
  const ctx = c.get("ctx");
  const form = await c.req.formData();

  const done = await removeAccount(
    ctx.db,
    ctx.user.id,
    field(form, "id"),
    ctx.now,
  );
  if (done.isErr()) return back(c, { error: errorToHttp(done.error).message });

  return back(c, {
    saved:
      done.value === "deleted"
        ? "Account deleted."
        : "Account archived, because it still has transactions.",
  });
}

export async function unarchive(c: Context<Env>) {
  const ctx = c.get("ctx");
  const form = await c.req.formData();
  const done = await restore(ctx.db, ctx.user.id, field(form, "id"));

  return done.isErr()
    ? back(c, { error: errorToHttp(done.error).message })
    : back(c, { saved: "Account restored." });
}
