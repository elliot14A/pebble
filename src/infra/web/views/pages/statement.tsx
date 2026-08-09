import type { Preview } from "@/app/statements";
import type { Account } from "@/core/accounts";
import { displayMoney, parseAmount } from "@/core/money";
import { Icon } from "@/infra/web/views/components/icons";
import { Shell } from "@/infra/web/views/layouts/shell";

export type StatementPageProps = Readonly<{
  accounts: ReadonlyArray<Account>;
  preview: Preview | null;
  fileName: string | null;
  notice: string | null;
  error: string | null;
}>;

const field =
  "rounded-tile bg-sunk px-2.5 py-2 text-[12px] font-semibold text-ink outline-none";

export function StatementPage(props: StatementPageProps) {
  const account =
    props.preview === null
      ? null
      : (props.accounts.find((one) => one.id === props.preview?.accountId) ??
        null);

  const currency = account?.currency ?? "INR";
  const money = (text: string): string => {
    const amount = parseAmount(text, currency);
    return amount.isErr()
      ? text
      : displayMoney(amount.value, { decimals: "never" });
  };

  return (
    <Shell title="Import" tab="none" notice={props.notice}>
      <div class="flex items-center justify-between gap-3 px-5 pt-4 pb-2">
        <a
          href="/settings"
          class="press grid h-9 w-9 place-items-center rounded-[11px] bg-sunk text-ink-2 no-underline"
          aria-label="Back to settings"
        >
          <Icon name="back" size={17} />
        </a>
        <span class="label">Import</span>
        <span class="h-9 w-9" />
      </div>

      <div class="px-5 pt-1 pb-4">
        <h1 class="text-[21px] font-bold tracking-[-0.035em]">
          From a statement
        </h1>
      </div>

      {props.error === null ? null : (
        <p class="pop mx-5 mb-3 rounded-tile bg-over-wash px-4 py-3 text-[12px] text-over">
          {props.error}
        </p>
      )}

      {props.preview === null ? (
        <form
          method="post"
          action="/settings/import"
          enctype="multipart/form-data"
          class="card mx-5 grid gap-2.5 p-4"
        >
          <select name="accountId" class={field}>
            {props.accounts.map((one) => (
              <option value={one.id}>
                {one.name} · {one.currency}
              </option>
            ))}
          </select>

          <label class="press flex cursor-pointer items-center gap-3 rounded-tile bg-sunk px-3 py-3">
            <span class="glyph h-10 w-10 flex-none rounded-[13px]">
              <Icon name="receipt" size={17} />
            </span>
            <span class="min-w-0 flex-1 text-[12.5px] font-semibold text-ink-2">
              Choose the csv your bank gave you
            </span>
            <input
              type="file"
              name="statement"
              accept=".csv,text/csv,text/plain"
              class="sr-only"
              onchange="this.form.submit()"
            />
          </label>
        </form>
      ) : null}

      {props.preview === null ? <Guide /> : null}

      {props.preview === null ? null : (
        <>
          <div class="mx-5 rounded-tile bg-money-wash px-4 py-3">
            <p class="text-[12px] font-semibold text-money-deep">
              {props.preview.fresh === 0
                ? "Every line here is already in pebble."
                : `${props.preview.fresh} to add from ${account?.name ?? "this account"}`}
            </p>
            <p class="mt-0.5 text-[10.5px] text-money-deep/70">
              {props.preview.seen.length - props.preview.fresh} already in ·{" "}
              {props.preview.skipped} lines were not transactions
            </p>
          </div>

          <div class="grid gap-2 px-5 pt-4">
            {props.preview.seen.slice(0, 40).map((row, index) => (
              <div
                class={`card rise flex items-center gap-3 p-3 ${row.already ? "opacity-50" : ""}`}
                style={`--i:${Math.min(index, 12)}`}
              >
                <span class="min-w-0 flex-1">
                  <b class="block truncate text-[12.5px] font-bold tracking-[-0.015em]">
                    {row.line.description === ""
                      ? "From the statement"
                      : row.line.description}
                  </b>
                  <span class="tnum text-[10.5px] text-ink-3">
                    {row.line.occurredOn}
                    {row.already ? " · already in" : ""}
                  </span>
                </span>
                <b
                  class={`amt flex-none text-[12.5px] tracking-[-0.03em] ${
                    row.line.direction === "in" ? "text-money-deep" : "text-ink"
                  }`}
                >
                  {row.line.direction === "in" ? "+" : "−"}
                  {money(row.line.amountText)}
                </b>
              </div>
            ))}
          </div>

          {props.preview.seen.length > 40 ? (
            <p class="px-5 pt-3 text-center text-[11px] text-ink-3">
              and {props.preview.seen.length - 40} more
            </p>
          ) : null}

          <div class="grid gap-2 px-5 pt-5 pb-2">
            <form method="post" action="/settings/import/confirm">
              <input
                type="hidden"
                name="accountId"
                value={props.preview.accountId}
              />
              <input
                type="hidden"
                name="fileName"
                value={props.fileName ?? ""}
              />
              <button
                type="submit"
                disabled={props.preview.fresh === 0}
                class="press flex h-12 w-full items-center justify-center gap-2 rounded-[15px] bg-money-deep text-[13px] font-bold text-on-money disabled:opacity-40"
              >
                <Icon name="check" size={16} />
                Add {props.preview.fresh}
              </button>
            </form>
            <a
              href="/settings/import"
              class="press flex h-11 w-full items-center justify-center rounded-[14px] bg-sunk text-[12.5px] font-semibold text-ink-2 no-underline"
            >
              Start again
            </a>
          </div>
        </>
      )}
    </Shell>
  );
}

const PROMPT = `Turn this bank statement into a csv for pebble.

Rules:
- Exactly these columns, in this order: date,description,amount,category
- date is YYYY-MM-DD
- amount is signed: negative for money leaving the account, positive for money
  arriving. No currency symbol, no thousands separators, a dot for decimals
- description is the merchant or a short human name, not the bank's reference
- category is one of: Food, Fuel, Groceries, Rent, Bills, Shopping, Travel,
  Fun, Health, Education, Investments, Salary, Miscellaneous. Leave it blank
  if you are not sure. Do not invent new ones
- One row per transaction, oldest first, no totals, no opening or closing
  balance rows, no blank lines
- Output only the csv`;

function Guide() {
  return (
    <div class="px-5 pt-4 pb-2" x-data="shareLink">
      <p class="label mb-2">What pebble expects</p>

      <div class="card p-4">
        <pre class="scroll-y overflow-x-auto rounded-tile bg-sunk p-3 text-[10.5px] leading-relaxed text-ink-2">
          {`date,description,amount,category
2026-08-01,Swiggy dinner,-1240.00,Food
2026-08-02,Salary August,85000.00,Salary
2026-08-03,Auto to work,-60,`}
        </pre>

        <p class="mt-3 text-[11px] text-ink-3">
          A csv straight from your bank usually works as it is. For a pdf, hand
          it to any assistant with the instructions below and save what comes
          back.
        </p>

        <textarea
          x-ref="url"
          readonly
          rows={4}
          class="scroll-y mt-3 w-full rounded-tile bg-sunk p-3 text-[10.5px] leading-relaxed text-ink-3 outline-none"
        >
          {PROMPT}
        </textarea>

        <button
          type="button"
          x-on:click="copy()"
          class="press mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-[13px] bg-sunk text-[12px] font-semibold text-ink-2"
        >
          <Icon name="check" size={14} />
          <span x-text="copied ? 'Copied' : 'Copy the instructions'">
            Copy the instructions
          </span>
        </button>
      </div>
    </div>
  );
}
