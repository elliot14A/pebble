import type { Context } from "hono";
import { analytics } from "@/app/analytics";
import { categoryBreakdown } from "@/app/categoryBreakdown";
import { totalOf } from "@/core/analytics";
import type { Env } from "@/infra/web/context";
import { errorToHttp } from "@/infra/web/errorMapper";
import { lookups } from "@/infra/web/lookups";
import { monthLabel, resolveMonth } from "@/infra/web/routes/analytics/month";
import { CategoryPage } from "@/infra/web/views/pages/category";

export async function category(c: Context<Env>) {
  const ctx = c.get("ctx");
  const categoryId = c.req.param("id") ?? "";
  const { month, thisMonth } = resolveMonth(c.req.query("month"), ctx.today);

  const data = await categoryBreakdown(
    ctx.db,
    ctx.user.id,
    categoryId,
    month,
  ).andThen((breakdown) =>
    analytics(ctx.db, ctx.user.id, month).andThen((summary) =>
      lookups(ctx).map((maps) => ({ breakdown, summary, maps })),
    ),
  );

  if (data.isErr()) {
    const { status, message } = errorToHttp(data.error);
    return c.text(message, status);
  }

  const { breakdown, summary, maps } = data.value;

  return c.html(
    <CategoryPage
      breakdown={breakdown}
      category={maps.categories.get(categoryId) ?? null}
      lookups={maps}
      baseCurrency={ctx.baseCurrency}
      monthLabel={monthLabel(month, thisMonth)}
      previousLabel={monthLabel(breakdown.previousMonth, thisMonth)}
      backHref={`/analytics?month=${month}`}
      ledgerHref={`/ledger?category=${categoryId}`}
      today={ctx.today}
      monthTotalMinor={totalOf(summary.categories)}
    />,
  );
}
