import type { Context } from "hono";
import { newId } from "@/core/id";
import {
  create,
  fetch as fetchTransaction,
} from "@/infra/d1/actions/transactions";
import type { Env } from "@/interfaces/web/context";
import { errorToHttp } from "@/interfaces/web/errorMapper";

export async function repeat(c: Context<Env>) {
  const ctx = c.get("ctx");
  const id = c.req.param("id") ?? "";

  const original = await fetchTransaction(ctx.db, ctx.user.id, id);
  if (original.isErr()) {
    const { status, message } = errorToHttp(original.error);
    return c.text(message, status);
  }

  const copied = await create(ctx.db, {
    ...original.value,
    id: newId(ctx.now),
    occurredOn: ctx.today,

    clientId: newId(ctx.now),
    createdAt: ctx.now,
    updatedAt: ctx.now,
    deletedAt: null,
  });

  if (copied.isErr()) {
    const { status, message } = errorToHttp(copied.error);
    return c.text(message, status);
  }

  return c.redirect("/ledger", 303);
}
