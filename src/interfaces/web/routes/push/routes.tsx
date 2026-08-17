import { Hono } from "hono";
import { displayMoney } from "@/core/money";
import { daysUntil } from "@/core/recurring";
import { remove, save } from "@/infra/d1/actions/push";
import { list as listRules } from "@/infra/d1/actions/recurring";
import { readPushConfig } from "@/interfaces/web/config";
import type { Env } from "@/interfaces/web/context";
import { errorToHttp } from "@/interfaces/web/errorMapper";

export const routes = (): Hono<Env> =>
  new Hono<Env>()
    .get("/push/key", (c) => {
      const keys = readPushConfig(c.env);
      return keys.publicKey === ""
        ? c.json({ error: "Notifications are not switched on." }, 503)
        : c.json({ publicKey: keys.publicKey });
    })

    .post("/push/subscribe", async (c) => {
      const ctx = c.get("ctx");
      const body = (await c.req.json().catch(() => null)) as {
        endpoint?: string;
      } | null;

      if (body?.endpoint === undefined || body.endpoint === "") {
        return c.json({ error: "No endpoint given." }, 400);
      }

      const saved = await save(ctx.db, ctx.user.id, body.endpoint, ctx.now);
      if (saved.isErr()) {
        const { status, message } = errorToHttp(saved.error);
        return c.json({ error: message }, status);
      }

      return c.json({ ok: true });
    })

    .post("/push/unsubscribe", async (c) => {
      const body = (await c.req.json().catch(() => null)) as {
        endpoint?: string;
      } | null;

      if (body?.endpoint === undefined) return c.json({ ok: true });

      await remove(c.get("ctx").db, body.endpoint);
      return c.json({ ok: true });
    })

    .get("/push/waiting", async (c) => {
      const ctx = c.get("ctx");
      const rules = await listRules(ctx.db, ctx.user.id);

      if (rules.isErr()) {
        const { status, message } = errorToHttp(rules.error);
        return c.json({ error: message }, status);
      }

      const due = rules.value.filter(
        (rule) =>
          rule.kind === "bill" && daysUntil(rule.nextOn, ctx.today) <= 0,
      );

      if (due.length === 0) return c.json({ title: null });

      const first = due[0];
      const single = due.length === 1 && first !== undefined;

      return c.json({
        title: single ? `${first.name} is due` : `${due.length} bills are due`,
        body: single
          ? `${displayMoney(
              { minor: first.amountMinor, currency: first.currency },
              { decimals: "never" },
            )} · ${when(first.nextOn, ctx.today)}`
          : due.map((rule) => rule.name).join(", "),
        ruleId: single ? first.id : null,
      });
    });

const when = (nextOn: string, today: string): string => {
  const days = daysUntil(nextOn, today);
  if (days === 0) return "due today";
  if (days === -1) return "a day late";
  return `${Math.abs(days)} days late`;
};
