import type { Account } from "@/core/accounts";
import type { Category } from "@/core/categories";
import { displayMoney } from "@/core/money";
import { daysUntil, type Recurring } from "@/core/recurring";
import { Icon } from "@/infra/web/views/components/icons";
import { Shell } from "@/infra/web/views/layouts/shell";
import { Confirm } from "@/infra/web/views/partials/confirm";

export type RecurringPageProps = Readonly<{
  rules: ReadonlyArray<Recurring>;
  accounts: ReadonlyArray<Account>;
  categories: ReadonlyArray<Category>;
  today: string;
  notice: string | null;
  error: string | null;
}>;

const field =
  "rounded-tile bg-sunk px-2.5 py-2 text-[12px] font-semibold text-ink outline-none";

const EVERY_LABEL: Readonly<Record<string, string>> = {
  week: "Every week",
  month: "Every month",
  year: "Every year",
};

const when = (rule: Recurring, today: string): string => {
  const days = daysUntil(rule.nextOn, today);
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  if (days === -1) return "A day late";
  if (days < 0) return `${Math.abs(days)} days late`;
  return `In ${days} days`;
};

export function RecurringPage(props: RecurringPageProps) {
  const bills = props.rules.filter((rule) => rule.kind === "bill");
  const auto = props.rules.filter((rule) => rule.kind === "transaction");

  return (
    <Shell title="Repeating" tab="none" notice={props.notice}>
      <div class="flex items-center justify-between gap-3 px-5 pt-4 pb-2">
        <a
          href="/settings"
          class="press grid h-9 w-9 place-items-center rounded-[11px] bg-sunk text-ink-2 no-underline"
          aria-label="Back to settings"
        >
          <Icon name="back" size={17} />
        </a>
        <span class="label">Repeating</span>
        <span class="h-9 w-9" />
      </div>

      <div class="px-5 pt-1 pb-4">
        <h1 class="text-[21px] font-bold tracking-[-0.035em]">Repeating</h1>
      </div>

      {props.error === null ? null : (
        <p class="pop mx-5 mb-3 rounded-tile bg-over-wash px-4 py-3 text-[12px] text-over">
          {props.error}
        </p>
      )}

      <div class="px-5 pt-2" x-data="notifyToggle">
        <button
          type="button"
          role="switch"
          aria-checked="false"
          x-bind:aria-checked="on ? 'true' : 'false'"
          x-on:click="toggle()"
          x-bind:disabled="busy"
          x-bind:class="busy ? 'opacity-60' : ''"
          class="press card rise flex w-full items-center gap-3.5 p-4 text-left"
        >
          <span class="glyph h-[42px] w-[42px] flex-none rounded-[13px]">
            <Icon name="bell" size={19} />
          </span>

          <span class="min-w-0 flex-1">
            <b class="block text-[13px] font-bold tracking-[-0.015em] text-ink">
              Bill reminders
            </b>
            <span
              class="block truncate text-[10.5px] text-ink-3"
              x-text="note !== '' ? note : (on ? 'A nudge when one is due' : 'Off')"
            />
          </span>

          <span
            class="switch flex-none"
            x-bind:class="on ? 'switch-on' : ''"
            aria-hidden="true"
          >
            <span class="switch-knob" />
          </span>
        </button>

        <button
          type="button"
          x-show="on"
          x-cloak
          x-on:click="test()"
          x-bind:disabled="busy"
          class="press mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-[13px] bg-sunk text-[12px] font-semibold text-ink-2"
        >
          <Icon name="bell" size={14} />
          Send a test
        </button>
      </div>

      <Section
        title="Bills to pay"
        empty="No bills set up."
        rules={bills}
        today={props.today}
        payable
      />

      <Section
        title="Logs itself"
        empty="Nothing repeating yet."
        rules={auto}
        today={props.today}
        payable={false}
      />

      <div class="px-5 pt-6 pb-2">
        <p class="label mb-2">Add one</p>
        <form
          method="post"
          action="/recurring"
          class="card grid gap-2.5 p-4"
          autocomplete="off"
        >
          <div class="grid grid-cols-2 gap-2">
            <input
              type="text"
              name="name"
              placeholder="Rent, Netflix, salary"
              required
              class={field}
            />
            <input
              type="text"
              name="amountText"
              inputmode="decimal"
              placeholder="Amount"
              required
              class={field}
            />
          </div>

          <div class="grid grid-cols-2 gap-2">
            <select name="kind" class={field}>
              <option value="bill">Remind me to pay</option>
              <option value="transaction">Log it for me</option>
            </select>
            <select name="every" class={field}>
              {Object.entries(EVERY_LABEL).map(([value, label]) => (
                <option value={value} selected={value === "month"}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div class="grid grid-cols-2 gap-2">
            <select name="accountId" class={field}>
              {props.accounts.map((account) => (
                <option value={account.id}>{account.name}</option>
              ))}
            </select>
            <select name="categoryId" class={field}>
              <option value="">No category</option>
              {props.categories.map((category) => (
                <option value={category.id}>{category.name}</option>
              ))}
            </select>
          </div>

          <div class="grid grid-cols-2 gap-2">
            <select name="type" class={field}>
              <option value="expense">Money out</option>
              <option value="income">Money in</option>
            </select>
            <input
              type="date"
              name="startOn"
              value={props.today}
              required
              class={field}
            />
          </div>

          <button
            type="submit"
            class="press mt-1 flex h-11 items-center justify-center gap-2 rounded-[14px] bg-money-deep text-[12.5px] font-bold text-on-money"
          >
            <Icon name="plus" size={15} />
            Add
          </button>
        </form>
      </div>
    </Shell>
  );
}

function Section(props: {
  title: string;
  empty: string;
  rules: ReadonlyArray<Recurring>;
  today: string;
  payable: boolean;
}) {
  return (
    <section class="px-5 pt-4">
      <p class="label mb-2">{props.title}</p>

      {props.rules.length === 0 ? (
        <p class="card py-5 text-center text-[11.5px] text-ink-3">
          {props.empty}
        </p>
      ) : (
        <div class="grid gap-2.5">
          {props.rules.map((rule, index) => {
            const late = daysUntil(rule.nextOn, props.today) < 0;

            return (
              <div class="card rise p-4" style={`--i:${index}`}>
                <div class="flex items-center gap-3.5">
                  <span class="glyph h-[42px] w-[42px] flex-none rounded-[13px]">
                    <Icon
                      name={props.payable ? "calendar" : "swap"}
                      size={19}
                    />
                  </span>
                  <span class="min-w-0 flex-1">
                    <b class="block truncate text-[13px] font-bold tracking-[-0.015em]">
                      {rule.name}
                    </b>
                    <span
                      class={`text-[10.5px] ${late ? "text-over" : "text-ink-3"}`}
                    >
                      {when(rule, props.today)}
                      {` · ${EVERY_LABEL[rule.every]?.toLowerCase() ?? rule.every}`}
                    </span>
                  </span>

                  <b
                    class={`amt flex-none text-[13px] tracking-[-0.03em] ${
                      rule.type === "income" ? "text-money-deep" : "text-ink"
                    }`}
                  >
                    {displayMoney(
                      { minor: rule.amountMinor, currency: rule.currency },
                      { decimals: "never" },
                    )}
                  </b>

                  <Confirm
                    action="/recurring/remove"
                    fields={{ id: rule.id }}
                    title={`Stop ${rule.name}?`}
                    body="Whatever it already logged stays in the ledger."
                    confirmLabel="Stop"
                    triggerLabel={`Stop ${rule.name}`}
                    triggerClass="press grid h-8 w-8 flex-none place-items-center rounded-[10px] bg-over-wash text-over"
                  />
                </div>

                {props.payable ? (
                  <form method="post" action="/recurring/pay" class="mt-2.5">
                    <input type="hidden" name="id" value={rule.id} />
                    <button
                      type="submit"
                      class="press flex h-9 w-full items-center justify-center gap-2 rounded-[12px] bg-money-wash text-[12px] font-semibold text-money-deep"
                    >
                      <Icon name="check" size={14} />
                      Paid it
                    </button>
                  </form>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
