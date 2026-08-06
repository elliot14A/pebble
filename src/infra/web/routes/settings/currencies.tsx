import type { Context } from "hono";
import { listInUse } from "@/app/rates/list";
import { remove as removeCurrency } from "@/app/rates/remove";
import { set } from "@/app/rates/set";
import type { Env } from "@/infra/web/context";
import { errorToHttp } from "@/infra/web/errorMapper";
import { CurrenciesPage } from "@/infra/web/views/pages/currencies";

const back = (c: Context<Env>, params: Record<string, string>) => {
  const query = new URLSearchParams(params).toString();
  return c.redirect(
    `/settings/currencies${query === "" ? "" : `?${query}`}`,
    303,
  );
};

export async function list(c: Context<Env>) {
  const ctx = c.get("ctx");
  const inUse = await listInUse(ctx.db, ctx.user.id, ctx.baseCurrency);

  if (inUse.isErr()) {
    const { status, message } = errorToHttp(inUse.error);
    return c.text(message, status);
  }

  return c.html(
    <CurrenciesPage
      inUse={inUse.value}
      baseCurrency={ctx.baseCurrency}
      today={ctx.today}
      message={c.req.query("saved") ?? null}
      error={c.req.query("error") ?? null}
    />,
  );
}

export async function save(c: Context<Env>) {
  const ctx = c.get("ctx");
  const form = await c.req.formData();
  const value = (key: string) => String(form.get(key) ?? "");

  const saved = await set(
    ctx.db,
    {
      userId: ctx.user.id,
      currency: value("currency"),
      rateText: value("rateText"),
      effectiveFrom: value("effectiveFrom") || undefined,
    },
    { baseCurrency: ctx.baseCurrency, now: ctx.now, today: ctx.today },
  );

  if (saved.isErr())
    return back(c, { error: errorToHttp(saved.error).message });

  const { backfilled } = saved.value;
  return back(c, {
    saved:
      backfilled === 0
        ? `${value("currency")} rate saved.`
        : backfilled === 1
          ? `${value("currency")} rate saved, and 1 transaction filled in.`
          : `${value("currency")} rate saved, and ${backfilled} transactions filled in.`,
  });
}

export async function remove(c: Context<Env>) {
  const ctx = c.get("ctx");
  const form = await c.req.formData();
  const currency = String(form.get("currency") ?? "");

  const done = await removeCurrency(ctx.db, ctx.user.id, currency);
  return done.isErr()
    ? back(c, { error: errorToHttp(done.error).message })
    : back(c, { saved: `${currency} removed.` });
}
