import type { Account } from "@/core/accounts";
import type { Category } from "@/core/categories";
import { CURRENCIES } from "@/core/money";
import { Icon } from "@/infra/web/views/components/icons";

export type QuickAddProps = Readonly<{
  accounts: ReadonlyArray<Account>;
  categories: ReadonlyArray<Category>;
  defaultAccountId: string | null;
  baseCurrency: string;
  today: string;

  rates: Readonly<Record<string, number>>;
  merchants: ReadonlyArray<
    Readonly<{ name: string; categoryId: string | null }>
  >;

  onLedger?: boolean;
}>;

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;
const VISIBLE = 8;

export function QuickAdd(props: QuickAddProps) {
  const accountCurrency = Object.fromEntries(
    props.accounts.map((account) => [account.id, account.currency]),
  );
  const currencies = Object.fromEntries(
    Object.values(CURRENCIES).map((currency) => [
      currency.code,
      { symbol: currency.symbol, exponent: currency.exponent },
    ]),
  );

  const usableFor = (kind: string, type: "income" | "expense") =>
    kind === "both" || kind === type;
  const rankFor = (type: "income" | "expense") => {
    const usable = props.categories.filter((c) => usableFor(c.kind, type));
    return new Map(usable.map((c, index) => [c.id, index]));
  };
  const expenseRank = rankFor("expense");
  const incomeRank = rankFor("income");
  const categoryKinds = Object.fromEntries(
    props.categories.map((category) => [category.id, category.kind]),
  );

  const rankExpression = (id: string): string =>
    `(type === 'income' ? ${incomeRank.get(id) ?? -1} : ${expenseRank.get(id) ?? -1})`;

  return (
    <div
      x-cloak
      x-data={`quickAdd(${JSON.stringify({
        accountCurrency,
        currencies,
        rates: props.rates,
        merchants: props.merchants,
        base: props.baseCurrency,
        defaultAccountId: props.defaultAccountId,
        today: props.today,
        categoryKinds,
        reloadOnSave: props.onLedger !== true,
      })})`}
      {...{ "x-on:pebble-open.window": "openSheet()" }}
    >
      <div
        x-show="open"
        {...{ "x-transition.opacity.duration.180ms": "" }}
        class="fixed inset-0 z-30 bg-[rgb(9_17_13/0.42)]"
        x-on:click="close()"
        aria-hidden="true"
      />

      <div
        x-show="open"
        x-transition:enter="transition ease-pebble duration-260"
        x-transition:enter-start="translate-y-full"
        x-transition:enter-end="translate-y-0"
        x-transition:leave="transition ease-pebble duration-180"
        x-transition:leave-start="translate-y-0"
        x-transition:leave-end="translate-y-full"
        class="sheet fixed inset-x-0 bottom-0 z-40 mx-auto flex max-h-[92dvh] max-w-[520px] flex-col"
        role="dialog"
        aria-label="Add a transaction"
      >
        <div class="mx-auto mb-3 h-1 w-9 flex-none rounded-sm bg-line" />

        <form
          class="flex min-h-0 flex-1 flex-col"
          hx-post="/transactions"
          hx-target="this"
          hx-swap="none"
          {...{
            "x-on:htmx:after-request": "saved($event)",
            "x-on:pebble-queued.window": "stow(false)",
          }}
        >
          <div class="flex flex-none gap-0.5 rounded-full bg-sunk p-0.5">
            {(["expense", "income", "transfer"] as const).map((kind) => (
              <button
                type="button"
                class="flex-1 rounded-full py-1.5 text-[11px] tracking-[0.03em] transition-colors duration-120"
                x-bind:class={`type === '${kind}' ? 'bg-ink text-paper font-bold' : 'text-ink-3'`}
                x-on:click={`setType('${kind}')`}
                data-kind={kind}
              >
                {kind === "expense"
                  ? "Expense"
                  : kind === "income"
                    ? "Income"
                    : "Transfer"}
              </button>
            ))}
          </div>

          <div class="flex-none pt-5 pb-4 text-center">
            <div
              class="amt flex items-baseline justify-center gap-1 text-[46px] leading-none tracking-[-0.06em]"
              x-bind:class="flash.amount ? 'lit' : ''"
            >
              <span class="text-[26px] text-ink-3" x-text="symbol()" />
              <span x-text="display()" />
              <span class="ml-1 h-10 w-0.5 animate-pulse rounded-sm bg-money" />
            </div>

            <div class="mt-4 px-1" x-show="type !== 'transfer'">
              <div
                class="scan-tile relative flex items-center gap-3 overflow-hidden rounded-[16px] border bg-money-wash px-4 py-3 text-left"
                x-bind:class="scanning ? 'reading pointer-events-none' : ''"
              >
                <span class="relative grid h-11 w-11 flex-none place-items-center overflow-hidden rounded-[13px] bg-money-deep text-on-money">
                  <template x-if="preview === ''">
                    <span class="grid place-items-center">
                      <Icon name="receipt" size={19} />
                    </span>
                  </template>
                  <template x-if="preview !== ''">
                    <img
                      x-bind:src="preview"
                      alt=""
                      class="h-full w-full object-cover"
                    />
                  </template>
                  <span class="scan-beam" x-show="scanning" x-cloak />
                </span>

                <span class="min-w-0 flex-1">
                  <b
                    class="block text-[13px] font-bold tracking-[-0.015em] text-money-deep"
                    x-text="scanning ? 'Reading the receipt' : 'Scan a receipt'"
                  />
                  <span class="block text-[10.5px] text-money-deep/70">
                    <span x-show="!scanning" x-cloak>
                      Photograph it, or pick one you have
                    </span>
                    <span class="dots" x-show="scanning" x-cloak>
                      Finding the amount, shop and date
                    </span>
                  </span>
                </span>

                <span class="flex flex-none gap-2" x-show="!scanning" x-cloak>
                  <label
                    class="press grid h-9 w-9 cursor-pointer place-items-center rounded-[11px] bg-money-deep text-on-money"
                    aria-label="Take a photo of the receipt"
                  >
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      class="sr-only"
                      x-on:change="scan($event)"
                      x-bind:disabled="scanning"
                    />
                    <Icon name="camera" size={17} />
                  </label>

                  <label
                    class="press grid h-9 w-9 cursor-pointer place-items-center rounded-[11px] border border-money-edge bg-paper text-money-deep"
                    aria-label="Pick a photo you already have"
                  >
                    <input
                      type="file"
                      accept="image/*"
                      class="sr-only"
                      x-on:change="scan($event)"
                      x-bind:disabled="scanning"
                    />
                    <Icon name="image" size={17} />
                  </label>
                </span>
              </div>
            </div>

            <p
              class="mx-auto mt-2 max-w-[17rem] text-center text-[11px]"
              x-bind:class="scanFailed ? 'text-over' : 'text-ink-3'"
              x-show="scanNote !== '' && !scanning"
              x-cloak
              x-text="scanNote"
            />

            <label
              class="mx-auto mt-3.5 flex w-full max-w-[15rem] items-center gap-1.5 border-b pb-1.5 transition-colors duration-150"
              x-bind:class="`${note.trim() === '' ? 'border-line' : 'border-money'} ${flash.name ? 'lit' : ''}`"
            >
              <input
                type="text"
                name="note"
                x-bind:placeholder="type === 'income' ? 'Who paid you?' : type === 'transfer' ? 'What is this move?' : 'What was it?'"
                placeholder="What was it?"
                required
                class="w-full bg-transparent text-center text-[15px] font-semibold tracking-[-0.015em] text-ink outline-none placeholder:font-normal placeholder:text-ink-4"
                autocomplete="off"
                autocapitalize="words"
                x-model="note"
              />
              <span
                x-show="note.trim() !== ''"
                class="flex-none text-money"
                aria-hidden="true"
              >
                <Icon name="check" size={14} />
              </span>
            </label>

            <div
              class="scroll-y -mx-5 mt-3 flex justify-start gap-2 overflow-x-auto px-5 sm:justify-center"
              x-show="suggestions().length > 0"
            >
              <template x-for="shop in suggestions()" x-bind:key="shop.name">
                <button
                  type="button"
                  class="chip press"
                  x-on:click="pickMerchant(shop)"
                  x-text="shop.name"
                />
              </template>
            </div>

            <p class="tnum mt-1.5 text-[11px] text-ink-3" x-text="hint()" />
          </div>

          <div class="scroll-y -mx-5 min-h-0 flex-1 px-5 pt-1">
            <section x-show="type !== 'transfer'">
              <header class="mb-2 flex items-baseline justify-between">
                <span
                  class="label"
                  x-text="type === 'income' ? 'What kind' : 'Category'"
                >
                  Category
                </span>
                <button
                  type="button"
                  class="press flex items-center gap-1 text-[12px] font-semibold tracking-[-0.01em] text-money"
                  x-on:click="showAll = !showAll"
                  x-show={`countFor(type) > ${VISIBLE}`}
                >
                  <span x-text="showAll ? 'Less' : 'All'">All</span>
                </button>
              </header>

              <div class="grid grid-cols-4 gap-2">
                {props.categories.map((category) => (
                  <button
                    type="button"
                    class="press grid justify-items-center gap-1.5 rounded-tile py-2.5 text-center text-[10px] leading-tight transition-colors duration-120"
                    x-show={`${rankExpression(category.id)} >= 0 && (${rankExpression(category.id)} < ${VISIBLE} || showAll || categoryId === ${JSON.stringify(category.id)})`}
                    x-bind:class={`categoryId === ${JSON.stringify(category.id)} ? 'bg-ink text-paper shadow-lift' : 'bg-surface text-ink-2 shadow-card'`}
                    x-on:click={`pickCategory(${JSON.stringify(category.id)})`}
                  >
                    <Icon name={category.glyph} size={17} />
                    {category.name}
                  </button>
                ))}
              </div>
            </section>

            <section x-show="type === 'transfer'">
              <header class="mb-2">
                <span class="label">Into</span>
              </header>
              <div class="flex flex-wrap gap-2">
                {props.accounts.map((account) => (
                  <button
                    type="button"
                    class="chip press"
                    x-bind:class={`counterAccountId === ${JSON.stringify(account.id)} ? 'chip-on' : ''`}
                    x-on:click={`counterAccountId = ${JSON.stringify(account.id)}`}
                  >
                    {account.name}
                  </button>
                ))}
              </div>
              <input
                type="hidden"
                name="counterAccountId"
                x-bind:value="counterAccountId"
                x-bind:disabled="type !== 'transfer'"
              />
            </section>

            <section class="mt-4" data-step="account">
              <header class="mb-2">
                <span
                  class="label"
                  x-text="type === 'transfer' ? 'Out of' : type === 'income' ? 'Paid into' : 'Paid with'"
                >
                  Paid with
                </span>
              </header>
              <div class="flex flex-wrap gap-2">
                {props.accounts.map((account) => (
                  <button
                    type="button"
                    class="chip press"
                    x-bind:class={`accountId === ${JSON.stringify(account.id)} ? 'chip-on' : ''`}
                    x-on:click={`pickAccount(${JSON.stringify(account.id)})`}
                  >
                    <Icon name="wallet" size={13} />
                    {account.name}
                  </button>
                ))}
              </div>
            </section>

            <section class="mt-4 pb-1" data-step="when">
              <header class="mb-2">
                <span
                  class="label"
                  x-text="type === 'income' ? 'Received on' : type === 'transfer' ? 'Moved on' : 'When'"
                >
                  When
                </span>
              </header>
              <div
                class="flex flex-wrap items-center gap-2"
                x-bind:class="flash.date ? 'lit' : ''"
              >
                <button
                  type="button"
                  class="chip press"
                  x-bind:class="occurredOn === today() ? 'chip-on' : ''"
                  x-on:click="occurredOn = today()"
                >
                  Today
                </button>
                <button
                  type="button"
                  class="chip press"
                  x-bind:class="occurredOn === yesterday() ? 'chip-on' : ''"
                  x-on:click="occurredOn = yesterday()"
                >
                  Yesterday
                </button>
                <label
                  class="chip press"
                  x-bind:class="occurredOn !== today() && occurredOn !== yesterday() ? 'chip-on' : ''"
                >
                  <Icon name="calendar" size={13} />
                  <input
                    type="date"
                    name="occurredOn"
                    class="w-[6.5rem] bg-transparent text-[11.5px] outline-none"
                    x-model="occurredOn"
                  />
                </label>
              </div>
            </section>
          </div>

          <div
            class="mt-3.5 grid flex-none grid-cols-3 gap-2"
            x-show="!showAll"
          >
            {KEYS.map((digit) => (
              <button
                type="button"
                class="key"
                x-on:click={`press('${digit}')`}
              >
                {digit}
              </button>
            ))}
            <button
              type="button"
              class="key key-ghost"
              x-on:click="press('.')"
              x-show="decimals() > 0"
            >
              .
            </button>
            <button
              type="button"
              class="key key-ghost"
              x-show="decimals() === 0"
              x-on:click="press('00')"
            >
              00
            </button>
            <button type="button" class="key" x-on:click="press('0')">
              0
            </button>
            <button
              type="button"
              class="key key-ghost"
              x-on:click="backspace()"
              aria-label="Delete"
            >
              <Icon name="backspace" size={20} />
            </button>
          </div>

          <input type="hidden" name="amountText" x-bind:value="amountText" />
          <input type="hidden" name="type" x-bind:value="type" />
          <input type="hidden" name="accountId" x-bind:value="accountId" />
          <input type="hidden" name="categoryId" x-bind:value="categoryId" />
          <input type="hidden" name="clientId" x-bind:value="clientId" />
          <input type="hidden" name="receiptId" x-bind:value="receiptId" />

          <button
            type="submit"
            class="press mt-3 flex h-[54px] w-full flex-none items-center justify-center gap-2.5 rounded-[17px] bg-money-deep text-sm font-bold text-on-money shadow-lift transition-opacity duration-150 disabled:opacity-40"
            x-bind:disabled="!ready()"
          >
            <span class="idle items-center gap-2.5">
              <span x-text="saveLabel()">Save</span>
              <span x-show="ready()">
                <Icon name="check" size={18} />
              </span>
            </span>
            <span class="busy items-center gap-2.5">
              Saving
              <svg
                class="spinner"
                width="18"
                height="18"
                viewBox="0 0 18 18"
                aria-hidden="true"
              >
                <circle
                  cx="9"
                  cy="9"
                  r="7"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-dasharray="33"
                  stroke-dashoffset="10"
                  opacity="0.9"
                />
              </svg>
            </span>
          </button>
        </form>
      </div>
    </div>
  );
}
