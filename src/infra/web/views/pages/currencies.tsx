import type { CurrencyInUse } from "@/app/rates";
import { currencyList } from "@/core/money";
import { formatRate } from "@/core/rates";
import { Icon } from "@/infra/web/views/components/icons";
import { Shell } from "@/infra/web/views/layouts/shell";
import { Confirm } from "@/infra/web/views/partials/confirm";

export type CurrenciesPageProps = Readonly<{
  inUse: ReadonlyArray<CurrencyInUse>;
  baseCurrency: string;
  today: string;
  message: string | null;
  error: string | null;
}>;

export function CurrenciesPage(props: CurrenciesPageProps) {
  const held = new Set(props.inUse.map((entry) => entry.currency));
  const available = currencyList().filter(
    (currency) =>
      currency.code !== props.baseCurrency && !held.has(currency.code),
  );

  return (
    <Shell title="Currencies" tab="none">
      <div class="flex items-center justify-between gap-3 px-5 pt-4 pb-2">
        <a
          href="/settings"
          class="press grid h-[34px] w-[34px] place-items-center rounded-[11px] border border-line bg-surface text-ink-2 no-underline"
          aria-label="Back to settings"
        >
          <Icon name="back" size={18} />
        </a>
        <span class="label">Currencies</span>
        <span class="w-[34px]" />
      </div>

      <div class="px-5 pt-1 pb-4">
        <h1 class="text-[21px] font-bold tracking-[-0.035em]">
          {props.baseCurrency} and friends
        </h1>
      </div>

      {props.error === null ? null : (
        <p class="pop mx-5 mb-3 rounded-tile bg-over-wash px-4 py-3 text-[12px] text-over">
          {props.error}
        </p>
      )}
      {props.message === null ? null : (
        <p class="pop mx-5 mb-3 rounded-tile bg-money-wash px-4 py-3 text-[12px] text-money-deep">
          {props.message}
        </p>
      )}

      {props.inUse.length === 0 ? (
        <div class="card mx-5 p-8 text-center">
          <p class="text-[13px] font-bold">Only {props.baseCurrency} so far</p>
          <p class="mt-1.5 text-[11.5px] text-ink-3">
            Add one below when you travel.
          </p>
        </div>
      ) : (
        <div class="grid gap-3 px-5">
          {props.inUse.map((entry, index) => (
            <form
              method="post"
              action="/settings/currencies"
              class="card rise p-4"
              style={`--i:${index}`}
              autocomplete="off"
            >
              <input type="hidden" name="currency" value={entry.currency} />
              <input type="hidden" name="effectiveFrom" value={props.today} />

              <div class="flex items-center gap-3">
                <span
                  class={`glyph ${entry.rate === null ? "glyph-warn" : "glyph-move"}`}
                >
                  {entry.currency}
                </span>
                <span class="min-w-0 flex-1">
                  <b class="block text-[13px] font-bold tracking-[-0.015em]">
                    1 {entry.currency}
                  </b>
                  <span class="text-[10.5px] text-ink-3">
                    {entry.rate === null
                      ? "No rate yet"
                      : `Set ${entry.rate.effectiveFrom}`}
                    {entry.accountsUsing > 0
                      ? ` · ${entry.accountsUsing} account${entry.accountsUsing === 1 ? "" : "s"}`
                      : ""}
                  </span>
                </span>
                <span class="text-[13px] text-ink-3">=</span>
                <input
                  type="text"
                  inputmode="decimal"
                  name="rateText"
                  value={
                    entry.rate === null ? "" : formatRate(entry.rate.rateE8)
                  }
                  placeholder="0.00"
                  aria-label={`Rate for ${entry.currency}`}
                  class="tnum w-24 rounded-tile bg-sunk px-2.5 py-1.5 text-right text-[13px] font-bold text-ink outline-none"
                />
              </div>

              {entry.pendingTransactions > 0 ? (
                <p class="mt-2.5 text-[11px] text-warn">
                  {entry.pendingTransactions === 1
                    ? "1 transaction is waiting on this rate."
                    : `${entry.pendingTransactions} transactions are waiting on this rate.`}
                </p>
              ) : null}

              <div class="mt-3 flex gap-2">
                <button
                  type="submit"
                  class="press flex h-10 flex-1 items-center justify-center rounded-[13px] bg-money-deep text-[12px] font-bold text-on-money"
                >
                  Save rate
                </button>
                <Confirm
                  action="/settings/currencies/remove"
                  fields={{ currency: entry.currency }}
                  title={`Remove ${entry.currency}?`}
                  body="Its rates are dropped. Transactions already saved keep the rate frozen onto them."
                  confirmLabel="Remove"
                  triggerLabel={`Remove ${entry.currency}`}
                  triggerClass="press grid h-10 w-10 flex-none place-items-center rounded-[13px] bg-over-wash text-over"
                />
              </div>
            </form>
          ))}
        </div>
      )}

      <form
        method="post"
        action="/settings/currencies"
        class="card mx-5 mt-5 p-4"
        autocomplete="off"
      >
        <p class="label mb-2.5">Add a currency</p>
        <input type="hidden" name="effectiveFrom" value={props.today} />
        <div class="flex items-center gap-2">
          <select
            name="currency"
            class="min-w-0 flex-1 rounded-tile bg-sunk px-2.5 py-2 text-[12px] font-bold text-ink outline-none"
          >
            {available.map((currency) => (
              <option value={currency.code}>
                {currency.code} · {currency.name}
              </option>
            ))}
          </select>
          <input
            type="text"
            inputmode="decimal"
            name="rateText"
            placeholder={`Per 1 ${props.baseCurrency === "INR" ? "unit" : props.baseCurrency}`}
            aria-label="Rate"
            class="tnum w-28 rounded-tile bg-sunk px-2.5 py-2 text-right text-[12px] font-bold text-ink outline-none"
          />
        </div>
        <button
          type="submit"
          class="press mt-3 flex h-10 w-full items-center justify-center rounded-[13px] bg-money-deep text-[12px] font-bold text-on-money"
        >
          Add
        </button>
      </form>
    </Shell>
  );
}
