import type { Child } from "hono/jsx";
import type { Analytics } from "@/app/analytics";
import { REST_KEY } from "@/app/analytics";
import { arcs, barHeight, maxOf, shareOf } from "@/core/analytics/chart";
import type { Change } from "@/core/analytics/compare";
import type { Bucket, MonthFlow } from "@/core/analytics/summary";
import type { Category } from "@/core/categories/category";
import { displayMoney } from "@/core/money/money";
import { Icon } from "@/infra/web/views/components/icons";
import { Shell } from "@/infra/web/views/layouts/shell";
import {
  QuickAdd,
  type QuickAddProps,
} from "@/infra/web/views/partials/quickAdd";

export type AnalyticsPageProps = Readonly<{
  data: Analytics;
  categories: ReadonlyMap<string, Category>;
  baseCurrency: string;
  previousHref: string;
  nextHref: string | null;
  monthLabel: string;
  previousLabel: string;
  quickAdd: QuickAddProps;
}>;

// Alternating light and dark so neighbouring slices separate. Four greens in a
// row read as one blob, which is what a donut is for avoiding.
const SLICES = [
  "var(--color-money-lift)",
  "var(--color-money-deep)",
  "var(--color-move)",
  "var(--color-money)",
  "var(--color-ink-4)",
  "var(--color-money-edge)",
];

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"] as const;

export function AnalyticsPage(props: AnalyticsPageProps) {
  const { data } = props;
  const money = (minor: number) =>
    displayMoney(
      { minor, currency: props.baseCurrency },
      { decimals: "never" },
    );

  const nameOf = (bucket: Bucket): string =>
    bucket.key === REST_KEY
      ? "Everything else"
      : (props.categories.get(bucket.key)?.name ?? "Uncategorised");

  return (
    <Shell title="Stats" tab="stats" sheet={<QuickAdd {...props.quickAdd} />}>
      <header class="flex items-center justify-between gap-3 px-5 pt-5 pb-4">
        <a
          href={props.previousHref}
          class="press grid h-9 w-9 place-items-center rounded-[11px] bg-sunk text-ink-2 no-underline"
          aria-label="Previous month"
        >
          <Icon name="back" size={17} />
        </a>
        <div class="text-center">
          <h1 class="text-[19px] font-bold tracking-[-0.035em]">
            {props.monthLabel}
          </h1>
          <p class="mt-0.5 text-[11.5px] text-ink-3">
            {data.transactionCount === 1
              ? "1 transaction"
              : `${data.transactionCount} transactions`}
          </p>
        </div>
        {props.nextHref === null ? (
          <span class="h-9 w-9" />
        ) : (
          <a
            href={props.nextHref}
            class="press grid h-9 w-9 place-items-center rounded-[11px] bg-sunk text-ink-2 no-underline"
            aria-label="Next month"
          >
            <Icon name="arrow" size={17} />
          </a>
        )}
      </header>

      <div class="grid gap-3 px-5">
        <section class="card rise grid grid-cols-3 gap-2 p-4">
          <Figure label="In" minor={data.inMinor} tone="money" money={money} />
          <Figure label="Out" minor={data.outMinor} tone="over" money={money} />
          <Figure
            label={data.savedMinor < 0 ? "Overspent" : "Saved"}
            minor={Math.abs(data.savedMinor)}
            tone={data.savedMinor < 0 ? "over" : "money"}
            money={money}
          />
        </section>

        <Compare
          data={data}
          previousLabel={props.previousLabel}
          nameOf={nameOf}
          money={money}
        />
        <Spending
          data={data}
          month={data.month}
          nameOf={nameOf}
          money={money}
        />
        <Months months={data.months} money={money} />
        <Merchants merchants={data.merchants} money={money} />
        <Weekdays weekdays={data.weekdays} money={money} />
      </div>
    </Shell>
  );
}

/**
 * Spending more is worse, earning more is better, so the same arrow has to mean
 * opposite things depending on which figure it sits next to.
 */
function Delta(props: { change: Change; upIsGood: boolean }) {
  const { deltaMinor, deltaBps } = props.change;
  if (deltaMinor === 0) {
    return <span class="text-[10.5px] text-ink-3">no change</span>;
  }

  const up = deltaMinor > 0;
  const good = up === props.upIsGood;

  return (
    <span
      class={`flex items-center gap-0.5 text-[10.5px] font-semibold ${
        good ? "text-money" : "text-over"
      }`}
    >
      <Icon name={up ? "trend" : "trenddown"} size={12} />
      {deltaBps === null
        ? "new"
        : `${up ? "+" : ""}${(deltaBps / 100).toFixed(0)}%`}
    </span>
  );
}

function Compare(props: {
  data: Analytics;
  previousLabel: string;
  nameOf: (bucket: Bucket) => string;
  money: (minor: number) => string;
}) {
  const { data } = props;
  const nothingToCompare =
    data.inChange.thenMinor === 0 && data.outChange.thenMinor === 0;

  return (
    <section class="card rise p-4" style="--i:1">
      <header class="mb-3 flex items-baseline justify-between">
        <span class="label">Compared with</span>
        <span class="text-[11px] text-ink-3">{props.previousLabel}</span>
      </header>

      {nothingToCompare ? (
        <Empty>Nothing recorded in {props.previousLabel}.</Empty>
      ) : (
        <>
          <div class="grid grid-cols-3 gap-2">
            <CompareFigure
              label="In"
              change={data.inChange}
              upIsGood
              money={props.money}
            />
            <CompareFigure
              label="Out"
              change={data.outChange}
              upIsGood={false}
              money={props.money}
            />
            <CompareFigure
              label={data.savedMinor < 0 ? "Overspent" : "Saved"}
              change={data.savedChange}
              upIsGood
              money={props.money}
              absolute
            />
          </div>

          {data.movers.length === 0 ? null : (
            <ul class="mt-4 grid gap-2.5 border-t border-line-soft pt-3.5">
              {data.movers.map((mover) => (
                <li>
                  <Drill
                    bucket={{ key: mover.key, minor: mover.nowMinor }}
                    month={props.data.month}
                    class="flex items-center gap-3 text-[11.5px] text-ink no-underline"
                  >
                    <span class="min-w-0 flex-1 truncate">
                      {props.nameOf({ key: mover.key, minor: mover.nowMinor })}
                    </span>
                    <span class="tnum flex-none text-ink-3">
                      {props.money(mover.thenMinor)} →{" "}
                      {props.money(mover.nowMinor)}
                    </span>
                    <span
                      class={`tnum flex-none font-semibold ${
                        mover.deltaMinor > 0 ? "text-over" : "text-money"
                      }`}
                    >
                      {mover.deltaMinor > 0 ? "+" : "−"}
                      {props.money(Math.abs(mover.deltaMinor)).replace("−", "")}
                    </span>
                  </Drill>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}

function CompareFigure(props: {
  label: string;
  change: Change;
  upIsGood: boolean;
  money: (minor: number) => string;
  absolute?: boolean;
}) {
  const shown = props.absolute
    ? Math.abs(props.change.nowMinor)
    : props.change.nowMinor;

  return (
    <div>
      <span class="label text-[11px]">{props.label}</span>
      <b class="amt mt-1.5 block text-[15px] tracking-[-0.03em]">
        {props.money(shown)}
      </b>
      <span class="mt-1 block">
        <Delta change={props.change} upIsGood={props.upIsGood} />
      </span>
    </div>
  );
}

function Figure(props: {
  label: string;
  minor: number;
  tone: "money" | "over";
  money: (minor: number) => string;
}) {
  return (
    <div>
      <span class="label text-[11px]">{props.label}</span>
      <b
        class={`amt mt-1.5 block text-[15px] tracking-[-0.03em] ${
          props.tone === "over" ? "text-over" : "text-money"
        }`}
      >
        {props.money(props.minor)}
      </b>
    </div>
  );
}

/**
 * Only a real category can be opened. "Everything else" is a bucket the chart
 * invented, so it stays inert rather than linking somewhere that cannot exist.
 */
function Drill(props: {
  bucket: Bucket;
  month: string;
  class: string;
  children: Child;
}) {
  if (props.bucket.key === REST_KEY || props.bucket.key === "") {
    return <span class={props.class}>{props.children}</span>;
  }
  return (
    <a
      href={`/analytics/category/${props.bucket.key}?month=${props.month}`}
      class={`press ${props.class}`}
    >
      {props.children}
    </a>
  );
}

function Spending(props: {
  data: Analytics;
  month: string;
  nameOf: (bucket: Bucket) => string;
  money: (minor: number) => string;
}) {
  const { data } = props;
  const RADIUS = 42;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
  const slices = arcs(
    data.categories.map((bucket) => bucket.minor),
    CIRCUMFERENCE,
  );

  return (
    <section class="card rise p-4" style="--i:1">
      <header class="mb-3 flex items-baseline justify-between">
        <span class="label">Where it went</span>
      </header>

      {data.categories.length === 0 ? (
        <Empty>Nothing spent this month.</Empty>
      ) : (
        <div class="flex items-center gap-4">
          <svg
            width="120"
            height="120"
            viewBox="0 0 120 120"
            role="img"
            aria-label="Spending by category"
            class="flex-none"
          >
            <circle
              cx="60"
              cy="60"
              r={RADIUS}
              fill="none"
              stroke="var(--color-sunk)"
              stroke-width="15"
            />
            {slices.map((arc, index) => (
              <circle
                cx="60"
                cy="60"
                r={RADIUS}
                fill="none"
                stroke={SLICES[index % SLICES.length]}
                stroke-width="15"
                stroke-dasharray={`${arc.length} ${arc.gap}`}
                stroke-dashoffset={arc.offset}
                transform="rotate(-90 60 60)"
              />
            ))}
            <text
              x="60"
              y="57"
              text-anchor="middle"
              font-size="15"
              font-weight="600"
              fill="var(--color-ink)"
              letter-spacing="-0.5"
            >
              {props.money(data.categoryTotal)}
            </text>
            <text
              x="60"
              y="71"
              text-anchor="middle"
              font-size="8"
              fill="var(--color-ink-3)"
            >
              spent
            </text>
          </svg>

          <ul class="grid min-w-0 flex-1 gap-2">
            {data.categories.map((bucket, index) => (
              <li>
                <Drill
                  bucket={bucket}
                  month={props.month}
                  class="flex items-center gap-2.5 text-[11.5px] text-ink no-underline"
                >
                  <span
                    class="h-2.5 w-2.5 flex-none rounded-[3px]"
                    style={`background:${SLICES[index % SLICES.length]}`}
                  />
                  <span class="min-w-0 flex-1 truncate">
                    {props.nameOf(bucket)}
                  </span>
                  <span class="tnum flex-none text-ink-3">
                    {shareOf(bucket.minor, data.categoryTotal)}%
                  </span>
                  <span class="tnum flex-none font-semibold">
                    {props.money(bucket.minor)}
                  </span>
                </Drill>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function Months(props: {
  months: ReadonlyArray<MonthFlow>;
  money: (minor: number) => string;
}) {
  const tallest = maxOf(
    props.months.flatMap((month) => [month.inMinor, month.outMinor]),
  );
  const AREA = 74;
  const step = 320 / Math.max(1, props.months.length);

  return (
    <section class="card rise p-4" style="--i:2">
      <header class="mb-3 flex items-baseline justify-between">
        <span class="label">In vs out</span>
        <span class="text-[11px] text-ink-3">{props.months.length} months</span>
      </header>

      {tallest === 0 ? (
        <Empty>No activity in this window yet.</Empty>
      ) : (
        <svg
          viewBox="0 0 320 108"
          width="100%"
          height="104"
          role="img"
          aria-label="Money in versus money out by month"
        >
          <line x1="0" y1="88" x2="320" y2="88" stroke="var(--color-line)" />
          {props.months.map((month, index) => {
            const left = index * step + step / 2;
            const inHeight = barHeight(month.inMinor, tallest, AREA);
            const outHeight = barHeight(month.outMinor, tallest, AREA);
            return (
              <>
                <rect
                  x={left - 17}
                  y={88 - inHeight}
                  width="15"
                  height={inHeight}
                  rx="4"
                  fill="var(--color-money)"
                />
                <rect
                  x={left + 2}
                  y={88 - outHeight}
                  width="15"
                  height={outHeight}
                  rx="4"
                  fill="var(--color-over)"
                />
                <text
                  x={left}
                  y="102"
                  text-anchor="middle"
                  font-size="9"
                  fill="var(--color-ink-4)"
                >
                  {month.month.slice(5)}
                </text>
              </>
            );
          })}
        </svg>
      )}
    </section>
  );
}

function Merchants(props: {
  merchants: ReadonlyArray<Bucket>;
  money: (minor: number) => string;
}) {
  const tallest = maxOf(props.merchants.map((merchant) => merchant.minor));

  return (
    <section class="card rise p-4" style="--i:3">
      <header class="mb-3">
        <span class="label">Top merchants</span>
      </header>

      {props.merchants.length === 0 ? (
        <Empty>Name a few expenses and they will rank here.</Empty>
      ) : (
        <ul class="grid gap-3">
          {props.merchants.map((merchant, index) => (
            <li class="flex items-center gap-3">
              <span class="tnum w-4 flex-none text-[10px] text-ink-4">
                {index + 1}
              </span>
              <span class="min-w-0 flex-1">
                <span class="block truncate text-[12px] font-semibold">
                  {merchant.key}
                </span>
                <span class="bar mt-1.5">
                  <i
                    style={`width:${tallest === 0 ? 0 : Math.round((merchant.minor / tallest) * 100)}%`}
                  />
                </span>
              </span>
              <span class="tnum flex-none text-[11.5px] font-semibold">
                {props.money(merchant.minor)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Weekdays(props: {
  weekdays: ReadonlyArray<number>;
  money: (minor: number) => string;
}) {
  const tallest = maxOf(props.weekdays);
  const worst = props.weekdays.indexOf(tallest);

  return (
    <section class="card rise mb-2 p-4" style="--i:4">
      <header class="mb-3 flex items-baseline justify-between">
        <span class="label">By weekday</span>
        {tallest > 0 ? (
          <span class="text-[11px] text-ink-3">
            Most on {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][worst]}
          </span>
        ) : null}
      </header>

      {tallest === 0 ? (
        <Empty>Nothing spent this month.</Empty>
      ) : (
        <svg
          viewBox="0 0 320 96"
          width="100%"
          height="92"
          role="img"
          aria-label="Spending by day of the week"
        >
          {props.weekdays.map((minor, index) => {
            const height = barHeight(minor, tallest, 74);
            const left = index * 45.7 + 6;
            return (
              <>
                <rect
                  x={left}
                  y={82 - height}
                  width="33"
                  height={height}
                  rx="6"
                  fill={
                    index === worst ? "var(--color-over)" : "var(--color-money)"
                  }
                />
                <text
                  x={left + 16}
                  y="94"
                  text-anchor="middle"
                  font-size="9"
                  fill="var(--color-ink-4)"
                >
                  {WEEKDAYS[index]}
                </text>
              </>
            );
          })}
        </svg>
      )}
    </section>
  );
}

function Empty(props: { children: Child }) {
  return (
    <p class="py-6 text-center text-[11.5px] text-ink-3">{props.children}</p>
  );
}
