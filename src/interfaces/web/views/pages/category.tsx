import type { CategoryBreakdown } from "@/app/categoryBreakdown";
import { barHeight, maxOf, shareOf } from "@/core/analytics";
import type { Category } from "@/core/categories";
import { displayMoney } from "@/core/money";
import { Icon } from "@/interfaces/web/views/components/icons";
import { Shell } from "@/interfaces/web/views/layouts/shell";
import { DayGroup } from "@/interfaces/web/views/partials/dayGroup";
import type { LedgerLookups } from "@/interfaces/web/views/partials/ledgerRow";

export type CategoryPageProps = Readonly<{
  breakdown: CategoryBreakdown;
  category: Category | null;
  lookups: LedgerLookups;
  baseCurrency: string;
  monthLabel: string;
  previousLabel: string;
  backHref: string;
  ledgerHref: string;
  today: string;
  monthTotalMinor: number;
}>;

export function CategoryPage(props: CategoryPageProps) {
  const { breakdown } = props;
  const money = (minor: number) =>
    displayMoney(
      { minor, currency: props.baseCurrency },
      { decimals: "never" },
    );

  const name = props.category?.name ?? "Uncategorised";
  const tallest = maxOf(breakdown.trend.map((bucket) => bucket.minor));
  const rising = breakdown.change.deltaMinor > 0;

  return (
    <Shell title={name} tab="stats">
      <header class="flex items-center justify-between gap-3 px-5 pt-4 pb-2">
        <a
          href={props.backHref}
          class="press grid h-9 w-9 place-items-center rounded-[11px] bg-sunk text-ink-2 no-underline"
          aria-label="Back to stats"
        >
          <Icon name="back" size={17} />
        </a>
        <span class="label">{props.monthLabel}</span>
        <span class="h-9 w-9" />
      </header>

      <div class="rise px-5 pt-3 pb-5 text-center">
        <span class="glyph mx-auto mb-3.5 h-14 w-14 rounded-[19px]">
          <Icon name={props.category?.glyph ?? "dots"} size={26} />
        </span>
        <h1 class="text-[19px] font-bold tracking-[-0.03em]">{name}</h1>
        <div class="amt mt-2 text-[32px] leading-none tracking-[-0.05em]">
          {money(breakdown.spentMinor)}
        </div>
        <p class="mt-2 text-[11.5px] text-ink-3">
          {shareOf(breakdown.spentMinor, props.monthTotalMinor)}% of the month
          {" · "}
          {breakdown.transactionCount === 1
            ? "1 transaction"
            : `${breakdown.transactionCount} transactions`}
        </p>
      </div>

      <div class="grid gap-3 px-5">
        <section class="card rise grid grid-cols-2 gap-2 p-4">
          <div>
            <span class="label text-[11px]">vs {props.previousLabel}</span>
            <b
              class={`amt mt-1.5 block text-[15px] tracking-[-0.03em] ${
                breakdown.change.deltaMinor === 0
                  ? "text-ink"
                  : rising
                    ? "text-over"
                    : "text-money"
              }`}
            >
              {breakdown.change.deltaMinor === 0
                ? "No change"
                : `${rising ? "+" : "−"}${money(Math.abs(breakdown.change.deltaMinor)).replace("−", "")}`}
            </b>
            <span class="mt-0.5 block text-[10.5px] text-ink-3">
              was {money(breakdown.change.thenMinor)}
            </span>
          </div>
          <div>
            <span class="label text-[11px]">Monthly average</span>
            <b class="amt mt-1.5 block text-[15px] tracking-[-0.03em]">
              {money(breakdown.averageMinor)}
            </b>
            <span class="mt-0.5 block text-[10.5px] text-ink-3">
              across months with activity
            </span>
          </div>
        </section>

        <section class="card rise p-4" style="--i:1">
          <header class="mb-3">
            <span class="label">Trend</span>
          </header>
          {tallest === 0 ? (
            <p class="py-5 text-center text-[11.5px] text-ink-3">
              Nothing spent here yet.
            </p>
          ) : (
            <svg
              viewBox="0 0 320 100"
              width="100%"
              height="96"
              role="img"
              aria-label={`${name} spending by month`}
            >
              {breakdown.trend.map((bucket, index) => {
                const step = 320 / breakdown.trend.length;
                const left = index * step + step / 2;
                const height = barHeight(
                  Math.max(0, bucket.minor),
                  tallest,
                  70,
                );
                const current = bucket.key === breakdown.month;
                return (
                  <>
                    <rect
                      x={left - 13}
                      y={82 - height}
                      width="26"
                      height={height}
                      rx="5"
                      fill={
                        current
                          ? "var(--color-money)"
                          : "var(--color-money-edge)"
                      }
                    />
                    <text
                      x={left}
                      y="96"
                      text-anchor="middle"
                      font-size="9"
                      fill={
                        current ? "var(--color-ink-2)" : "var(--color-ink-4)"
                      }
                    >
                      {bucket.key.slice(5)}
                    </text>
                  </>
                );
              })}
            </svg>
          )}
        </section>

        {breakdown.merchants.length === 0 ? null : (
          <section class="card rise p-4" style="--i:2">
            <header class="mb-3">
              <span class="label">Where it went</span>
            </header>
            <ul class="grid gap-3">
              {breakdown.merchants.map((merchant) => (
                <li class="flex items-center gap-3">
                  <span class="min-w-0 flex-1">
                    <span class="block truncate text-[12px] font-semibold">
                      {merchant.key}
                    </span>
                    <span class="bar mt-1.5">
                      <i
                        style={`width:${shareOf(merchant.minor, breakdown.merchants[0]?.minor ?? 1)}%`}
                      />
                    </span>
                  </span>
                  <span class="tnum flex-none text-[11.5px] font-semibold">
                    {money(merchant.minor)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div class="rise" style="--i:3">
          <div class="mb-1 flex items-baseline justify-between">
            <span class="label">Transactions</span>
            <a
              href={props.ledgerHref}
              class="text-[12px] font-semibold text-money no-underline"
            >
              In the ledger ›
            </a>
          </div>
          {breakdown.days.map((day) => (
            <DayGroup day={day} lookups={props.lookups} today={props.today} />
          ))}
        </div>
      </div>
    </Shell>
  );
}
