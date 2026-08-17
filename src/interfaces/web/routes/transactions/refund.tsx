import type { Context } from "hono";
import { refund as makeRefund } from "@/app/transactions";
import type { Env } from "@/interfaces/web/context";
import { errorToHttp } from "@/interfaces/web/errorMapper";

export async function refund(c: Context<Env>) {
  const ctx = c.get("ctx");
  const id = c.req.param("id") ?? "";
  const form = await c.req.formData();
  const amountText = form.get("amountText");

  const done = await makeRefund(ctx.db, {
    userId: ctx.user.id,
    id,
    amountText: typeof amountText === "string" ? amountText : "",
    today: ctx.today,
    now: ctx.now,
  });

  if (done.isErr()) {
    const { message } = errorToHttp(done.error);
    return c.redirect(
      `/transactions/${id}?error=${encodeURIComponent(message)}`,
      303,
    );
  }

  return c.redirect(`/transactions/${done.value.id}`, 303);
}
