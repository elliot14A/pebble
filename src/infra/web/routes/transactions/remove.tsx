import type { Context } from "hono";
import {
  remove as removeTransaction,
  restore,
} from "@/infra/d1/actions/transactions";
import type { Env } from "@/infra/web/context";
import { errorToHttp } from "@/infra/web/errorMapper";

export async function remove(c: Context<Env>) {
  const ctx = c.get("ctx");
  const id = c.req.param("id") ?? "";
  const done = await removeTransaction(ctx.db, ctx.user.id, id, ctx.now);

  if (done.isErr()) {
    const { status, message } = errorToHttp(done.error);
    return c.text(message, status);
  }

  return c.req.method === "POST"
    ? c.redirect(`/ledger?undo=${id}`, 303)
    : c.body(null, 200);
}

export async function undo(c: Context<Env>) {
  const ctx = c.get("ctx");
  const done = await restore(
    ctx.db,
    ctx.user.id,
    c.req.param("id") ?? "",
    ctx.now,
  );

  if (done.isErr()) {
    const { status, message } = errorToHttp(done.error);
    return c.text(message, status);
  }
  return c.redirect("/ledger", 303);
}
