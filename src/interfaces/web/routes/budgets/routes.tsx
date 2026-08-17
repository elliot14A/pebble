import { Hono } from "hono";
import { overview, set } from "@/app/budgets";
import { remove } from "@/infra/d1/actions/budgets";
import type { Env } from "@/interfaces/web/context";
import { errorToHttp } from "@/interfaces/web/errorMapper";
import { backTo, field } from "@/interfaces/web/form";
import { BudgetsPage } from "@/interfaces/web/views/pages/budgets";

const back = (params: Record<string, string>): string =>
  backTo("/budgets", params);

export const routes = (): Hono<Env> =>
  new Hono<Env>()
    .get("/budgets", async (c) => {
      const ctx = c.get("ctx");
      const month = c.req.query("month") ?? ctx.today.slice(0, 7);

      const data = await overview(ctx.db, ctx.user.id, month, ctx.today);

      if (data.isErr()) {
        const { status, message } = errorToHttp(data.error);
        return c.text(message, status);
      }

      return c.html(
        <BudgetsPage
          data={data.value}
          baseCurrency={ctx.baseCurrency}
          notice={c.req.query("saved") ?? null}
          error={c.req.query("error") ?? null}
        />,
      );
    })

    .post("/budgets", async (c) => {
      const ctx = c.get("ctx");
      const form = await c.req.formData();
      const categoryId = field(form, "categoryId");

      const saved = await set(ctx.db, {
        userId: ctx.user.id,
        categoryId: categoryId === "" ? null : categoryId,
        amountText: field(form, "amountText"),
        currency: ctx.baseCurrency,
        now: ctx.now,
      });

      return c.redirect(
        saved.isErr()
          ? back({ error: errorToHttp(saved.error).message })
          : back({ saved: "Budget set." }),
        303,
      );
    })

    .post("/budgets/remove", async (c) => {
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
          : back({ saved: "Budget removed." }),
        303,
      );
    });
