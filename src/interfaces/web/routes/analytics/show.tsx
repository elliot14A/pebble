import type { Context } from "hono";
import { analytics } from "@/app/analytics";
import { quickAdd } from "@/app/quickAdd";
import type { Env } from "@/interfaces/web/context";
import { errorToHttp } from "@/interfaces/web/errorMapper";
import { lookups } from "@/interfaces/web/lookups";
import {
  monthLabel,
  resolveMonth,
  shiftMonth,
} from "@/interfaces/web/routes/analytics/month";
import { AnalyticsPage } from "@/interfaces/web/views/pages/analytics";

export async function show(c: Context<Env>) {
  const ctx = c.get("ctx");
  const { month, thisMonth } = resolveMonth(c.req.query("month"), ctx.today);

  const data = await analytics(ctx.db, ctx.user.id, month).andThen((summary) =>
    lookups(ctx).andThen((maps) =>
      quickAdd(ctx.db, ctx.user.id, ctx.today).map((sheet) => ({
        summary,
        maps,
        sheet,
      })),
    ),
  );

  if (data.isErr()) {
    const { status, message } = errorToHttp(data.error);
    return c.text(message, status);
  }

  const next = shiftMonth(month, 1);

  return c.html(
    <AnalyticsPage
      data={data.value.summary}
      categories={data.value.maps.categories}
      baseCurrency={ctx.baseCurrency}
      monthLabel={monthLabel(month, thisMonth)}
      previousLabel={monthLabel(data.value.summary.previousMonth, thisMonth)}
      previousHref={`/analytics?month=${shiftMonth(month, -1)}`}
      nextHref={next > thisMonth ? null : `/analytics?month=${next}`}
      quickAdd={{
        ...data.value.sheet,
        baseCurrency: ctx.baseCurrency,
        today: ctx.today,
      }}
    />,
  );
}
