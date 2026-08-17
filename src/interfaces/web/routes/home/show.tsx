import type { Context } from "hono";
import { overview as budgetOverview } from "@/app/budgets";
import { overview } from "@/app/overview";
import { quickAdd } from "@/app/quickAdd";
import type { Env } from "@/interfaces/web/context";
import { errorToHttp } from "@/interfaces/web/errorMapper";
import { lookups } from "@/interfaces/web/lookups";
import { HomePage } from "@/interfaces/web/views/pages/home";
import { dayLabel } from "@/interfaces/web/views/partials/dayGroup";

const greetingFor = (hour: number): string => {
  if (hour < 5) return "Late night";
  if (hour < 12) return "Morning";
  if (hour < 17) return "Afternoon";
  return "Evening";
};

export async function show(c: Context<Env>) {
  const ctx = c.get("ctx");

  const data = await overview(
    ctx.db,
    ctx.user.id,
    ctx.baseCurrency,
    ctx.today,
  ).andThen((summary) =>
    lookups(ctx).andThen((maps) =>
      quickAdd(ctx.db, ctx.user.id, ctx.today).andThen((sheet) =>
        budgetOverview(
          ctx.db,
          ctx.user.id,
          ctx.today.slice(0, 7),
          ctx.today,
        ).map((budgets) => ({ summary, maps, sheet, budgets })),
      ),
    ),
  );

  if (data.isErr()) {
    const { status, message } = errorToHttp(data.error);
    return c.text(message, status);
  }

  return c.html(
    <HomePage
      user={ctx.user}
      overview={data.value.summary}
      budget={data.value.budgets.overall}
      lookups={data.value.maps}
      greeting={greetingFor(new Date(ctx.now).getUTCHours())}
      todayLabel={dayLabel(ctx.today, ctx.today)}
      quickAdd={{
        ...data.value.sheet,
        baseCurrency: ctx.baseCurrency,
        today: ctx.today,
      }}
    />,
  );
}
