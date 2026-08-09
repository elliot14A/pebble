import { Hono } from "hono";
import { visible as listCategories } from "@/app/categories";
import { pay, remove, save } from "@/app/recurring";
import { list as listAccounts } from "@/infra/d1/actions/accounts";
import { list as listRules } from "@/infra/d1/actions/recurring";
import type { Env } from "@/infra/web/context";
import { errorToHttp } from "@/infra/web/errorMapper";
import { RecurringPage } from "@/infra/web/views/pages/recurring";

const field = (form: FormData, key: string): string => {
  const value = form.get(key);
  return typeof value === "string" ? value : "";
};

const back = (params: Record<string, string>): string =>
  `/settings/repeating?${new URLSearchParams(params).toString()}`;

export const routes = (): Hono<Env> =>
  new Hono<Env>()
    .get("/settings/repeating", async (c) => {
      const ctx = c.get("ctx");

      const data = await listRules(ctx.db, ctx.user.id).andThen((rules) =>
        listAccounts(ctx.db, ctx.user.id).andThen((accounts) =>
          listCategories(ctx.db, ctx.user.id).map((categories) => ({
            rules,
            accounts,
            categories,
          })),
        ),
      );

      if (data.isErr()) {
        const { status, message } = errorToHttp(data.error);
        return c.text(message, status);
      }

      return c.html(
        <RecurringPage
          rules={data.value.rules}
          accounts={data.value.accounts}
          categories={data.value.categories}
          today={ctx.today}
          notice={c.req.query("saved") ?? null}
          error={c.req.query("error") ?? null}
        />,
      );
    })

    .post("/recurring", async (c) => {
      const ctx = c.get("ctx");
      const form = await c.req.formData();
      const categoryId = field(form, "categoryId");

      const saved = await save(ctx.db, {
        userId: ctx.user.id,
        id: null,
        kind: field(form, "kind"),
        type: field(form, "type"),
        name: field(form, "name"),
        amountText: field(form, "amountText"),
        accountId: field(form, "accountId"),
        categoryId: categoryId === "" ? null : categoryId,
        every: field(form, "every"),
        startOn: field(form, "startOn"),
        now: ctx.now,
      });

      return c.redirect(
        saved.isErr()
          ? back({ error: errorToHttp(saved.error).message })
          : back({ saved: `${saved.value.name} added.` }),
        303,
      );
    })

    .post("/recurring/pay", async (c) => {
      const ctx = c.get("ctx");
      const form = await c.req.formData();

      const done = await pay(
        ctx.db,
        ctx.user.id,
        field(form, "id"),
        ctx.baseCurrency,
        ctx.now,
      );

      return c.redirect(
        done.isErr()
          ? back({ error: errorToHttp(done.error).message })
          : back({ saved: "Logged, and moved to next time." }),
        303,
      );
    })

    .post("/recurring/remove", async (c) => {
      const ctx = c.get("ctx");
      const form = await c.req.formData();

      const done = await remove(
        ctx.db,
        ctx.user.id,
        field(form, "id"),
        ctx.now,
      );

      return c.redirect(
        done.isErr()
          ? back({ error: errorToHttp(done.error).message })
          : back({ saved: "Stopped." }),
        303,
      );
    });
