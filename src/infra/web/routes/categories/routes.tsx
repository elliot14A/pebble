import { Hono } from "hono";
import { board, remove, save } from "@/app/categories";
import { show } from "@/infra/d1/actions/categories";
import type { Env } from "@/infra/web/context";
import { errorToHttp } from "@/infra/web/errorMapper";
import { CategoriesPage } from "@/infra/web/views/pages/categories";

const field = (form: FormData, key: string): string => {
  const value = form.get(key);
  return typeof value === "string" ? value : "";
};

const back = (params: Record<string, string>): string =>
  `/settings/categories?${new URLSearchParams(params).toString()}`;

export const routes = (): Hono<Env> =>
  new Hono<Env>()
    .get("/settings/categories", async (c) => {
      const ctx = c.get("ctx");
      const data = await board(ctx.db, ctx.user.id);

      if (data.isErr()) {
        const { status, message } = errorToHttp(data.error);
        return c.text(message, status);
      }

      return c.html(
        <CategoriesPage
          board={data.value}
          notice={c.req.query("saved") ?? null}
          error={c.req.query("error") ?? null}
        />,
      );
    })

    .post("/categories", async (c) => {
      const ctx = c.get("ctx");
      const form = await c.req.formData();
      const id = field(form, "id");

      const saved = await save(ctx.db, {
        userId: ctx.user.id,
        id: id === "" ? null : id,
        name: field(form, "name"),
        kind: field(form, "kind"),
        glyph: field(form, "glyph"),
        tint: field(form, "tint"),
        now: ctx.now,
      });

      return c.redirect(
        saved.isErr()
          ? back({ error: errorToHttp(saved.error).message })
          : back({ saved: `${saved.value.name} saved.` }),
        303,
      );
    })

    .post("/categories/remove", async (c) => {
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
          : back({
              saved:
                done.value === "deleted"
                  ? "Category deleted."
                  : "Hidden. Your history keeps its label.",
            }),
        303,
      );
    })

    .post("/categories/show", async (c) => {
      const ctx = c.get("ctx");
      const form = await c.req.formData();

      const done = await show(ctx.db, ctx.user.id, field(form, "id"));

      return c.redirect(
        done.isErr()
          ? back({ error: errorToHttp(done.error).message })
          : back({ saved: "Back in the list." }),
        303,
      );
    });
