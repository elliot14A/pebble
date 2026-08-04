import type { Context } from "hono";
import { quickAdd } from "@/app/quickAdd";
import { type DayGroup, groupByDay } from "@/core/transactions/balance";
import {
  count,
  list as listTransactions,
} from "@/infra/d1/actions/transactions";
import type { Env } from "@/infra/web/context";
import { errorToHttp } from "@/infra/web/errorMapper";
import { lookups } from "@/infra/web/lookups";
import { filterHref, parseQuery } from "@/infra/web/routes/transactions/query";
import { LedgerPage } from "@/infra/web/views/pages/ledger";
import { LedgerList } from "@/infra/web/views/partials/ledgerList";

const PAGE_ROWS = 60;

type Page = Readonly<{ days: ReadonlyArray<DayGroup>; cursor: string | null }>;

/**
 * Pages by whole days, never by row, so a day can never be split across two
 * pages and render its header twice with half its rows under each.
 */
const paginate = (
  rows: ReadonlyArray<unknown>,
  days: ReadonlyArray<DayGroup>,
): Page => {
  const more = rows.length > PAGE_ROWS;
  if (!more) return { days, cursor: null };

  // A single day bigger than a page still has to render, or paging stalls.
  const kept = days.length > 1 ? days.slice(0, -1) : days;
  return { days: kept, cursor: kept.at(-1)?.date ?? null };
};

export async function list(c: Context<Env>) {
  const ctx = c.get("ctx");
  const url = new URL(c.req.url);
  const parsed = parseQuery(url, ctx.user.id);

  const data = await listTransactions(ctx.db, {
    ...parsed.query,
    limit: PAGE_ROWS + 1,
  }).andThen((rows) =>
    count(ctx.db, parsed.query).andThen((total) =>
      lookups(ctx).map((maps) => ({ rows, total, maps })),
    ),
  );

  if (data.isErr()) {
    const { status, message } = errorToHttp(data.error);
    return c.text(message, status);
  }

  const { days, cursor } = paginate(
    data.value.rows,
    groupByDay(data.value.rows),
  );

  const list = (
    <LedgerList
      days={days}
      lookups={data.value.maps}
      today={ctx.today}
      moreHref={
        cursor === null
          ? null
          : filterHref(url, { before: cursor, fragment: "1" })
      }
      refreshHref={filterHref(url, { fragment: "1" })}
      emptyBecauseSearch={parsed.search !== ""}
      search={parsed.search}
      append={parsed.before !== null}
    />
  );

  // "Load more" and the post-save refresh both swap this fragment in place.
  if (c.req.query("fragment") === "1") {
    return c.html(
      <>
        {list}
        <p
          id="ledger-count"
          class="mt-0.5 text-[11.5px] text-ink-3"
          hx-swap-oob="true"
        >
          {data.value.total === 1
            ? "1 transaction"
            : `${data.value.total} transactions`}
        </p>
      </>,
    );
  }

  const sheet = await quickAdd(ctx.db, ctx.user.id, ctx.today);
  if (sheet.isErr()) {
    const { status, message } = errorToHttp(sheet.error);
    return c.text(message, status);
  }

  return c.html(
    <LedgerPage
      list={list}
      count={data.value.total}
      search={parsed.search}
      activeFilters={parsed.filters}
      undoId={url.searchParams.get("undo")}
      quickAdd={{
        ...sheet.value,
        baseCurrency: ctx.baseCurrency,
        today: ctx.today,
      }}
    />,
  );
}
