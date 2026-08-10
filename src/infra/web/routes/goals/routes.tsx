import { Hono } from "hono";
import { putAway, save } from "@/app/goals";
import { list, remove } from "@/infra/d1/actions/goals";
import type { Env } from "@/infra/web/context";
import { errorToHttp } from "@/infra/web/errorMapper";
import { backTo, field } from "@/infra/web/form";
import { GoalsPage } from "@/infra/web/views/pages/goals";

const back = (params: Record<string, string>): string =>
  backTo("/settings/goals", params);

export const routes = (): Hono<Env> =>
  new Hono<Env>()
    .get("/settings/goals", async (c) => {
      const ctx = c.get("ctx");
      const found = await list(ctx.db, ctx.user.id);

      if (found.isErr()) {
        const { status, message } = errorToHttp(found.error);
        return c.text(message, status);
      }

      return c.html(
        <GoalsPage
          goals={found.value}
          baseCurrency={ctx.baseCurrency}
          today={ctx.today}
          notice={c.req.query("saved") ?? null}
          error={c.req.query("error") ?? null}
        />,
      );
    })

    .post("/goals", async (c) => {
      const ctx = c.get("ctx");
      const form = await c.req.formData();
      const targetOn = field(form, "targetOn");

      const saved = await save(ctx.db, {
        userId: ctx.user.id,
        name: field(form, "name"),
        targetText: field(form, "targetText"),
        currency: ctx.baseCurrency,
        targetOn: targetOn === "" ? null : targetOn,
        now: ctx.now,
      });

      return c.redirect(
        saved.isErr()
          ? back({ error: errorToHttp(saved.error).message })
          : back({ saved: `${saved.value.name} added.` }),
        303,
      );
    })

    .post("/goals/put", async (c) => {
      const ctx = c.get("ctx");
      const form = await c.req.formData();

      const moved = await putAway(
        ctx.db,
        ctx.user.id,
        field(form, "id"),
        field(form, "amountText"),
        ctx.now,
      );

      return c.redirect(
        moved.isErr()
          ? back({ error: errorToHttp(moved.error).message })
          : back({ saved: "Put away." }),
        303,
      );
    })

    .post("/goals/remove", async (c) => {
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
          : back({ saved: "Dropped." }),
        303,
      );
    });
