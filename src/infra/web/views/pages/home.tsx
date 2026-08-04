import type { BudgetLine } from "@/app/budgets/overview";
import type { Overview } from "@/app/overview";
import { displayMoney } from "@/core/money/money";
import type { User } from "@/core/users/user";
import { initials } from "@/core/users/user";
import { Icon } from "@/infra/web/views/components/icons";
import { Shell } from "@/infra/web/views/layouts/shell";
import { AppBar } from "@/infra/web/views/partials/appBar";
import {
  type LedgerLookups,
  LedgerRow,
} from "@/infra/web/views/partials/ledgerRow";
import {
  QuickAdd,
  type QuickAddProps,
} from "@/infra/web/views/partials/quickAdd";

export type HomePageProps = Readonly<{
  user: User;
  overview: Overview;
  budget: BudgetLine | null;
  lookups: LedgerLookups;
  quickAdd: QuickAddProps;
  greeting: string;
  todayLabel: string;
}>;

const percent = (bps: number): string => `${(bps / 100).toFixed(1)}%`;

export function HomePage(props: HomePageProps) {
  const { overview, lookups } = props;
  const base = lookups.baseCurrency;

  return (
    <Shell title="pebble" tab="home" sheet={<QuickAdd {...props.quickAdd} />}>
      <AppBar
        greeting={props.greeting}
        name={props.user.displayName}
        subtitle={props.todayLabel}
        initial={initials(props.user)}
        alert={overview.fxPendingCount > 0}
      />

      <div class="px-5">
        <NetWorth overview={overview} base={base} />

        <div class="mt-3 grid grid-cols-2 gap-3">
          <div class="card rise p-3.5" style="--i:1">
            <span class="label">
              {overview.savedMinor < 0 ? "Overspent" : "Saved"}
            </span>
            <b
              class={`amt mt-2 block text-lg tracking-[-0.035em] ${
                overview.savedMinor < 0 ? "text-over" : "text-ink"
              }`}
            >
              {displayMoney(
                { minor: Math.abs(overview.savedMinor), currency: base },
                { decimals: "never" },
              )}
            </b>
            <span
              class={`mt-0.5 block text-[10.5px] ${
                overview.savedMinor < 0 ? "text-over" : "text-money"
              }`}
            >
              {overview.savedMinor < 0
                ? "more than you earned"
                : `${percent(overview.savingsRateBps)} rate`}
            </span>
          </div>
          <div class="card rise p-3.5" style="--i:2">
            <span class="label">Daily avg</span>
            <b class="amt mt-2 block text-lg tracking-[-0.035em]">
              {displayMoney(
                { minor: overview.dailyAverageMinor, currency: base },
                { decimals: "never" },
              )}
            </b>
            <span class="mt-0.5 block text-[10.5px] text-ink-3">
              this month
            </span>
          </div>
        </div>

        <BudgetCard line={props.budget} base={base} />

        {overview.fxPendingCount > 0 ? (
          <a
            href="/settings/currencies"
            class="press rise mt-3 flex items-center gap-3 rounded-card bg-warn-wash p-3.5 text-ink-2 no-underline"
            style="--i:3"
          >
            <span class="text-[12px]">
              <b class="block text-[12.5px] text-ink">
                {overview.fxPendingCount === 1
                  ? "1 transaction has no rate"
                  : `${overview.fxPendingCount} transactions have no rate`}
              </b>
              Set the rate and they fill in.
            </span>
          </a>
        ) : null}

        <section class="rise mt-4" style="--i:4">
          <header class="mb-3 flex items-center justify-between">
            <span class="label">Recent</span>
            <a href="/ledger" class="text-[11px] tracking-[0.06em] text-money">
              Ledger ›
            </a>
          </header>
          {overview.recent.length === 0 ? (
            <Empty />
          ) : (
            <div class="card overflow-hidden">
              {overview.recent.map((transaction) => (
                <LedgerRow transaction={transaction} lookups={lookups} />
              ))}
            </div>
          )}
        </section>
      </div>
    </Shell>
  );
}

function NetWorth(props: { overview: Overview; base: string }) {
  const { overview, base } = props;
  return (
    <section class="rise relative overflow-hidden rounded-card bg-money-deep p-5 text-on-money shadow-lift">
      <span
        class="pointer-events-none absolute -right-16 -bottom-28 h-60 w-60 rounded-full bg-white/5"
        aria-hidden="true"
      />
      <span class="label text-on-money/[0.88]">Net worth</span>
      <div
        class="amt mt-2 flex items-baseline gap-0.5 text-[34px] leading-none tracking-[-0.05em]"
        data-count={overview.netWorthMinor}
        data-currency={base}
      >
        {displayMoney({ minor: overview.netWorthMinor, currency: base })}
      </div>
      {overview.unconvertedAccounts > 0 ? (
        <p class="mt-1.5 text-[11px] text-on-money/70">
          {overview.unconvertedAccounts} account
          {overview.unconvertedAccounts === 1 ? "" : "s"} not counted, no rate
          yet
        </p>
      ) : null}
      <div class="relative mt-4 flex gap-6">
        <span
          class="absolute top-0.5 bottom-0.5 left-1/2 w-px bg-on-money/15"
          aria-hidden="true"
        />
        <div class="flex-1">
          <span class="label text-on-money/[0.88]">In this month</span>
          <b class="amt mt-1 block text-[15px] tracking-[-0.02em]">
            {displayMoney(
              { minor: overview.inMinor, currency: base },
              { decimals: "never" },
            )}
          </b>
        </div>
        <div class="flex-1 pl-5">
          <span class="label text-on-money/[0.88]">Out this month</span>
          <b class="amt mt-1 block text-[15px] tracking-[-0.02em]">
            {displayMoney(
              { minor: overview.outMinor, currency: base },
              { decimals: "never" },
            )}
          </b>
        </div>
      </div>
    </section>
  );
}

function Empty() {
  return (
    <div class="card p-8 text-center">
      <p class="text-[13px] font-bold">Nothing logged yet</p>
      <p class="mt-1.5 text-[11.5px] text-ink-3">
        Tap the button below. An amount is all you need.
      </p>
    </div>
  );
}

function BudgetCard(props: { line: BudgetLine | null; base: string }) {
  const money = (minor: number): string =>
    displayMoney({ minor, currency: props.base }, { decimals: "never" });

  if (props.line === null) {
    return (
      <a
        href="/budgets"
        class="press rise mt-3 flex items-center gap-3 rounded-card bg-sunk p-3.5 text-ink-2 no-underline"
        style="--i:3"
      >
        <span class="flex-1 text-[12px]">
          <b class="block text-[12.5px] text-ink">Set a monthly budget</b>
          <span class="text-[11px] text-ink-3">Know where you stand</span>
        </span>
        <Icon name="arrow" size={16} />
      </a>
    );
  }

  const { progress, dailyLeftMinor } = props.line;
  const tone =
    progress.state === "over"
      ? "text-over"
      : progress.state === "close"
        ? "text-warn"
        : "text-ink";
  const bar =
    progress.state === "over"
      ? "bg-over"
      : progress.state === "close"
        ? "bg-warn"
        : "bg-money-deep";

  return (
    <a
      href="/budgets"
      class="card press rise mt-3 block p-3.5 no-underline"
      style="--i:3"
    >
      <span class="flex items-baseline justify-between gap-3">
        <span class="label">Budget</span>
        <span class={`tnum text-[11px] font-semibold ${tone}`}>
          {Math.round(progress.usedBps / 100)}%
        </span>
      </span>

      <span class="mt-1.5 flex items-baseline gap-1.5">
        <b class={`amt text-lg tracking-[-0.035em] ${tone}`}>
          {money(Math.abs(progress.leftMinor))}
        </b>
        <span class="text-[11px] text-ink-3">
          {progress.leftMinor < 0 ? "over" : "left"}
        </span>
      </span>

      <span class="mt-2 block h-2 overflow-hidden rounded-full bg-sunk">
        <span
          class={`block h-full rounded-full ${bar}`}
          style={`width:${Math.min(progress.usedBps / 100, 100)}%`}
        />
      </span>

      {dailyLeftMinor === null ? null : (
        <span class="mt-1.5 block text-[10.5px] text-ink-3">
          {money(dailyLeftMinor)} a day for the rest of the month
        </span>
      )}
    </a>
  );
}
