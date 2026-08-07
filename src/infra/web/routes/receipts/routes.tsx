import { Hono } from "hono";
import { detach } from "@/app/receipts/detach";
import { scan } from "@/app/receipts/scan";
import { attach, fetch as fetchReceipt } from "@/infra/d1/actions/receipts";
import { reader } from "@/infra/openrouter/receipt";
import { getReceipt } from "@/infra/r2/receipts";
import type { Env } from "@/infra/web/context";
import { errorToHttp } from "@/infra/web/errorMapper";

const field = (form: FormData, key: string): string => {
  const value = form.get(key);
  return typeof value === "string" ? value : "";
};

export const routes = (): Hono<Env> =>
  new Hono<Env>()
    .post("/receipts/scan", async (c) => {
      const ctx = c.get("ctx");
      const form = await c.req.formData();
      const file = form.get("photo");

      if (!(file instanceof File)) {
        return c.json({ error: "Pick a photo of the receipt." }, 400);
      }

      const key = c.env.OPENROUTER_API_KEY;
      if (key === undefined || key === "") {
        return c.json(
          { error: "Receipt reading is not switched on yet." },
          503,
        );
      }

      const scanned = await scan(
        ctx.db,
        c.env.RECEIPTS,
        reader(key, new URL(c.req.url).origin),
        {
          userId: ctx.user.id,
          bytes: await file.arrayBuffer(),
          contentType: file.type,
          today: ctx.today,
          now: ctx.now,
          model: c.env.PEBBLE_RECEIPT_MODEL,
        },
      );

      const transactionId = field(form, "transactionId");

      if (scanned.isErr()) {
        const { status, message } = errorToHttp(scanned.error);
        return transactionId === ""
          ? c.json({ error: message }, status)
          : c.redirect(
              `/transactions/${transactionId}?error=${encodeURIComponent(message)}`,
              303,
            );
      }

      const { receipt, reading } = scanned.value;

      if (transactionId !== "") {
        const linked = await attach(
          ctx.db,
          ctx.user.id,
          receipt.id,
          transactionId,
        );
        if (linked.isErr()) {
          const { status, message } = errorToHttp(linked.error);
          return c.text(message, status);
        }
        return c.redirect(`/transactions/${transactionId}`, 303);
      }

      return c.json({
        id: receipt.id,
        amountText: reading.amountText,
        name: reading.merchant,
        occurredOn: reading.occurredOn,
        currency: reading.currency,
        read: receipt.readAt !== null,
      });
    })

    .get("/receipts/:id", async (c) => {
      const ctx = c.get("ctx");

      const found = await fetchReceipt(ctx.db, ctx.user.id, c.req.param("id"));
      if (found.isErr()) {
        const { status, message } = errorToHttp(found.error);
        return c.text(message, status);
      }
      if (found.value === null) return c.text("No such receipt.", 404);

      const object = await getReceipt(c.env.RECEIPTS, found.value.objectKey);
      if (object.isErr()) {
        const { status, message } = errorToHttp(object.error);
        return c.text(message, status);
      }
      if (object.value === null) return c.text("No such receipt.", 404);

      return new Response(object.value.body, {
        headers: {
          "content-type": found.value.contentType,
          "cache-control": "private, max-age=31536000, immutable",
        },
      });
    })

    .post("/receipts/:id/attach", async (c) => {
      const ctx = c.get("ctx");
      const form = await c.req.formData();
      const transactionId = field(form, "transactionId");

      const done = await attach(
        ctx.db,
        ctx.user.id,
        c.req.param("id"),
        transactionId === "" ? null : transactionId,
      );

      if (done.isErr()) {
        const { status, message } = errorToHttp(done.error);
        return c.text(message, status);
      }

      return c.redirect(`/transactions/${transactionId}`, 303);
    })

    .post("/receipts/:id/remove", async (c) => {
      const ctx = c.get("ctx");
      const form = await c.req.formData();

      const done = await detach(
        ctx.db,
        c.env.RECEIPTS,
        ctx.user.id,
        c.req.param("id"),
      );

      if (done.isErr()) {
        const { status, message } = errorToHttp(done.error);
        return c.text(message, status);
      }

      const back = field(form, "back");
      return c.redirect(back === "" ? "/" : back, 303);
    });
