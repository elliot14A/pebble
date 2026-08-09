import type { Context } from "hono";
import { create as createTransaction } from "@/app/transactions";
import { isTransactionType } from "@/core/transactions";
import { attach as attachReceipt } from "@/infra/d1/actions/receipts";
import type { Env } from "@/infra/web/context";
import { errorToHttp } from "@/infra/web/errorMapper";

const text = (form: FormData, key: string): string | null => {
  const value = form.get(key);
  return typeof value === "string" && value !== "" ? value : null;
};

export async function create(c: Context<Env>) {
  const ctx = c.get("ctx");
  const form = await c.req.formData();

  const type = text(form, "type") ?? "expense";
  const accountId = text(form, "accountId");
  const amountText = text(form, "amountText");
  const clientId = text(form, "clientId");

  if (accountId === null || amountText === null || clientId === null) {
    return c.text("An amount and an account are required.", 400);
  }
  if (!isTransactionType(type)) {
    return c.text(`Unknown transaction type ${type}.`, 400);
  }

  const saved = await createTransaction(
    ctx.db,
    {
      userId: ctx.user.id,
      accountId,
      counterAccountId: text(form, "counterAccountId"),
      categoryId: text(form, "categoryId"),
      type,
      amountText,
      occurredOn: text(form, "occurredOn") ?? undefined,
      note: text(form, "note"),
      clientId,
    },
    { baseCurrency: ctx.baseCurrency, now: ctx.now, today: ctx.today },
  );

  if (saved.isErr()) {
    const { status, message } = errorToHttp(saved.error);
    return c.text(message, status);
  }

  const receiptId = text(form, "receiptId");
  if (receiptId !== null && receiptId !== "") {
    await attachReceipt(ctx.db, ctx.user.id, receiptId, saved.value.id);
  }

  c.header("HX-Trigger", "pebble:saved");
  return c.body(null, 204);
}
