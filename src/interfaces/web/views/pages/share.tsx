import { raw } from "hono/html";
import { REST_KEY, type SharedView } from "@/app/shares";
import type { Bucket } from "@/core/analytics";
import { arcs, shareOf } from "@/core/analytics";
import { displayMoney } from "@/core/money";
import { formatRange } from "@/core/shares";
import { IconSprite } from "@/interfaces/web/views/components/icons";
import { DayGroup } from "@/interfaces/web/views/partials/dayGroup";

export type SharePageProps = Readonly<{
  view?: SharedView;
  gone?: string;
}>;

const SLICES = [
  "var(--color-money-deep)",
  "var(--color-money)",
  "var(--color-money-lift)",
  "var(--color-move)",
  "var(--color-warn)",
  "var(--color-ink-3)",
];

const RADIUS = 42;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function Frame(props: { title: string; children: unknown }) {
  return (
    <>
      {raw("<!DOCTYPE html>")}
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1, viewport-fit=cover"
          />
          <title>{props.title}</title>
          <meta name="color-scheme" content="light dark" />
          <meta name="robots" content="noindex, nofollow" />
          <link rel="stylesheet" href="/css/app.css" />
        </head>
        <body class="bg-paper text-ink">
          <IconSprite />
          <main class="mx-auto w-full max-w-[520px] pb-16">
            {props.children as never}
          </main>
        </body>
      </html>
    </>
  );
}

export function SharePage(props: SharePageProps) {
  if (props.view === undefined) {
    return (
      <Frame title="Link unavailable">
        <div class="card mx-5 mt-24 p-8 text-center">
          <b class="block text-[15px] font-bold tracking-[-0.02em]">
            {props.gone ?? "This link is not available any more."}
          </b>
        </div>
      </Frame>
    );
  }

  const data = props.view;
  const base = data.owner.baseCurrency;
  const money = (minor: number): string =>
    displayMoney({ minor, currency: base }, { decimals: "never" });

  const nameOf = (bucket: Bucket): string =>
    bucket.key === REST_KEY
      ? "Everything else"
      : (data.categoryMap.get(bucket.key)?.name ?? "Uncategorised");

  const slices = arcs(
    data.categories.map((bucket) => bucket.minor),
    CIRCUMFERENCE,
  );

  const range = formatRange(data.share.fromDate, data.share.toDate);

  return (
    <Frame title={`${data.owner.displayName} · pebble`}>
      <header class="px-5 pt-6 pb-4">
        <span class="label">Shared with you</span>
        <h1 class="mt-1 text-[21px] font-bold tracking-[-0.035em]">
          {data.share.label === ""
            ? `${data.owner.displayName}'s spending`
            : data.share.label}
        </h1>
        <p class="tnum mt-1 text-[11.5px] text-ink-3">{range}</p>
      </header>

      <section class="px-5">
        <div class="card rise grid grid-cols-3 gap-3 p-4">
          <div>
            <span class="label">Out</span>
            <b class="amt mt-1.5 block text-[16px] tracking-[-0.035em] text-over">
              {money(data.outMinor)}
            </b>
          </div>
          <div>
            <span class="label">In</span>
            <b class="amt mt-1.5 block text-[16px] tracking-[-0.035em] text-money-deep">
              {money(data.inMinor)}
            </b>
          </div>
          <div>
            <span class="label">
              {data.savedMinor < 0 ? "Overspent" : "Saved"}
            </span>
            <b
              class={`amt mt-1.5 block text-[16px] tracking-[-0.035em] ${
                data.savedMinor < 0 ? "text-over" : "text-ink"
              }`}
            >
              {money(Math.abs(data.savedMinor))}
            </b>
          </div>
        </div>
      </section>

      {data.categories.length === 0 ? null : (
        <section class="px-5 pt-3">
          <div class="card rise p-4" style="--i:1">
            <span class="label">Where it went</span>
            <div class="mt-3 flex items-center gap-4">
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
              </svg>

              <ul class="min-w-0 flex-1 grid gap-1.5">
                {data.categories.map((bucket, index) => (
                  <li class="flex items-center gap-2">
                    <span
                      class="h-2 w-2 flex-none rounded-full"
                      style={`background:${SLICES[index % SLICES.length]}`}
                    />
                    <span class="min-w-0 flex-1 truncate text-[11.5px]">
                      {nameOf(bucket)}
                    </span>
                    <span class="tnum text-[11px] text-ink-3">
                      {shareOf(bucket.minor, data.categoryTotal)}%
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      )}

      <section class="px-5 pt-5">
        <p class="label mb-2">
          {data.transactionCount === 1
            ? "1 entry"
            : `${data.transactionCount} entries`}
        </p>
        {data.days.length === 0 ? (
          <p class="card py-8 text-center text-[11.5px] text-ink-3">
            Nothing in this stretch.
          </p>
        ) : (
          data.days.map((day) => (
            <DayGroup
              day={day}
              today=""
              lookups={{
                categories: data.categoryMap,
                accounts: data.accountMap,
                baseCurrency: base,
              }}
            />
          ))
        )}
      </section>

      <p class="px-5 pt-8 text-center text-[10.5px] text-ink-3">
        Shared from pebble by {data.owner.displayName}
      </p>
    </Frame>
  );
}
