import { Hono } from "hono";
import { daysUntil } from "@/core/recurring";
import { listFor, remove, save } from "@/infra/d1/actions/push";
import { list as listRules } from "@/infra/d1/actions/recurring";
import { notify } from "@/infra/push";
import { readPushConfig } from "@/infra/web/config";
import type { Env } from "@/infra/web/context";
import { errorToHttp } from "@/infra/web/errorMapper";

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

    .post("/push/test", async (c) => {
      const ctx = c.get("ctx");
      const keys = readPushConfig(c.env);

      if (keys.publicKey === "" || keys.privateKey === "") {
        return c.json({ error: "Notifications are not switched on." }, 503);
      }

      const devices = await listFor(ctx.db, ctx.user.id);
      if (devices.isErr()) {
        const { status, message } = errorToHttp(devices.error);
        return c.json({ error: message }, status);
      }
      if (devices.value.length === 0) {
        return c.json({ error: "This device is not subscribed yet." }, 400);
      }

      const replies: number[] = [];
      for (const device of devices.value) {
        const status = await notify(device.endpoint, keys, ctx.now);
        replies.push(status.isOk() ? status.value : 0);
        if (status.isOk() && (status.value === 404 || status.value === 410)) {
          await remove(ctx.db, device.endpoint);
        }
      }

      const good = replies.filter((code) => code > 0 && code < 300).length;
      return c.json({ devices: replies.length, accepted: good, replies });
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
      return c.json({
        title:
          due.length === 1
            ? `${first?.name} is due`
            : `${due.length} bills are due`,
        body:
          due.length === 1
            ? "Tap to log it once you have paid."
            : due.map((rule) => rule.name).join(", "),
      });
    });
