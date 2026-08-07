import { Hono } from "hono";
import { create } from "@/app/shares/create";
import { view } from "@/app/shares/view";
import { isSpan } from "@/core/shares/share";
import { list, revoke } from "@/infra/d1/actions/shares";
import type { Env } from "@/infra/web/context";
import { errorToHttp } from "@/infra/web/errorMapper";
import { SharePage } from "@/infra/web/views/pages/share";
import { SharesPage } from "@/infra/web/views/pages/shares";

const field = (form: FormData, key: string): string => {
  const value = form.get(key);
  return typeof value === "string" ? value : "";
};

const back = (params: Record<string, string>): string =>
  `/shares?${new URLSearchParams(params).toString()}`;

const originOf = (url: string, host: string | undefined): string => {
  const parsed = new URL(url);
  return host === undefined ? parsed.origin : `${parsed.protocol}//${host}`;
};

export const routes = (): Hono<Env> =>
  new Hono<Env>()
    .get("/s/:token", async (c) => {
      const shared = await view(c.get("db"), c.req.param("token"), Date.now());

      if (shared.isErr()) {
        const { status, message } = errorToHttp(shared.error);
        return c.html(<SharePage gone={message} />, status);
      }

      return c.html(<SharePage view={shared.value} />);
    })

    .get("/shares", async (c) => {
      const ctx = c.get("ctx");
      const shares = await list(ctx.db, ctx.user.id);

      if (shares.isErr()) {
        const { status, message } = errorToHttp(shares.error);
        return c.text(message, status);
      }

      return c.html(
        <SharesPage
          shares={shares.value}
          origin={originOf(c.req.url, c.req.header("Host"))}
          today={ctx.today}
          now={ctx.now}
          notice={c.req.query("saved") ?? null}
          error={c.req.query("error") ?? null}
        />,
      );
    })

    .post("/shares", async (c) => {
      const ctx = c.get("ctx");
      const form = await c.req.formData();
      const span = field(form, "span");

      const made = await create(ctx.db, {
        userId: ctx.user.id,
        span: isSpan(span) ? span : "month",
        from: field(form, "from") || undefined,
        to: field(form, "to") || undefined,
        label: field(form, "label"),
        expiresInDays: Number(field(form, "expiresInDays")) || 0,
        today: ctx.today,
        now: ctx.now,
      });

      return c.redirect(
        made.isErr()
          ? back({ error: errorToHttp(made.error).message })
          : back({ saved: made.value.token }),
        303,
      );
    })

    .post("/shares/revoke", async (c) => {
      const ctx = c.get("ctx");
      const form = await c.req.formData();

      const done = await revoke(
        ctx.db,
        ctx.user.id,
        field(form, "id"),
        ctx.now,
      );

      return c.redirect(
        done.isErr()
          ? back({ error: errorToHttp(done.error).message })
          : back({ saved: "revoked" }),
        303,
      );
    });
