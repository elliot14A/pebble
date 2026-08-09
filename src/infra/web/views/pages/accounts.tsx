import type { AccountBalance } from "@/app/accounts";
import {
  ACCOUNT_KIND_LABEL,
  ACCOUNT_KINDS,
  type Account,
  isLiability,
} from "@/core/accounts";
import { displayMoney } from "@/core/money";
import { Amount } from "@/infra/web/views/components/amount";
import { Icon } from "@/infra/web/views/components/icons";
import { Shell } from "@/infra/web/views/layouts/shell";
import { Confirm } from "@/infra/web/views/partials/confirm";
import {
  QuickAdd,
  type QuickAddProps,
} from "@/infra/web/views/partials/quickAdd";

export type AccountsPageProps = Readonly<{
  accounts: ReadonlyArray<AccountBalance>;
  archived: ReadonlyArray<Account>;
  currencies: ReadonlyArray<string>;
  baseCurrency: string;
  quickAdd: QuickAddProps;
  editing: string | null;
  message: string | null;
  error: string | null;
}>;

const kindIcon = (account: Account): string => {
  if (account.kind === "credit_card") return "receipt";
  if (account.kind === "cash") return "coins";
  if (account.kind === "wallet") return "wallet";
  return "home";
};

export function AccountsPage(props: AccountsPageProps) {
  const foreign = props.accounts.filter(
    (entry) => entry.account.currency !== props.baseCurrency,
  ).length;

  const total = props.accounts.reduce(
    (sum, entry) => sum + (entry.baseMinor ?? 0),
    0,
  );

  return (
    <Shell title="Money" tab="money" sheet={<QuickAdd {...props.quickAdd} />}>
      <div class="px-5 pt-5 pb-3.5">
        <h1 class="text-[21px] font-bold tracking-[-0.035em]">Money</h1>
        <p class="mt-0.5 text-[11.5px] text-ink-3">
          {props.accounts.length} account
          {props.accounts.length === 1 ? "" : "s"}
          {foreign > 0 ? ` · ${foreign} foreign` : ""}
        </p>
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

      <div class="grid gap-3 px-5">
        {props.accounts.length === 0 ? (
          <div class="card p-8 text-center">
            <p class="text-[13px] font-bold">No accounts yet</p>
            <p class="mt-1.5 text-[11.5px] text-ink-3">
              Add your first one below.
            </p>
          </div>
        ) : (
          props.accounts.map((entry, index) =>
            props.editing === entry.account.id ? (
              <Editor
                account={entry.account}
                currencies={props.currencies}
                baseCurrency={props.baseCurrency}
                index={index}
              />
            ) : (
              <div
                class="card rise flex items-center gap-3 p-4"
                style={`--i:${index}`}
              >
                <a
                  href={`/ledger?account=${entry.account.id}`}
                  class="flex min-w-0 flex-1 items-center gap-3.5 text-ink no-underline"
                >
                  <span
                    class={`glyph h-[42px] w-[42px] flex-none rounded-[13px] ${
                      entry.account.currency === props.baseCurrency
                        ? "glyph-flat"
                        : "glyph-move"
                    }`}
                  >
                    <Icon name={kindIcon(entry.account)} size={19} />
                  </span>
                  <span class="min-w-0 flex-1">
                    <b class="block truncate text-[13px] font-bold tracking-[-0.015em]">
                      {entry.account.name}
                    </b>
                    <span class="text-[10.5px] text-ink-3">
                      {ACCOUNT_KIND_LABEL[entry.account.kind]}
                      {entry.account.currency === props.baseCurrency
                        ? ""
                        : ` · ${entry.account.currency}`}
                    </span>
                  </span>
                  <Amount
                    minor={entry.balanceMinor}
                    currency={entry.account.currency}
                    baseMinor={entry.baseMinor}
                    baseCurrency={props.baseCurrency}
                    size="tile"
                    tone={
                      isLiability(entry.account) && entry.balanceMinor < 0
                        ? "over"
                        : "ink"
                    }
                  />
                </a>
                <a
                  href={`/accounts?edit=${entry.account.id}`}
                  class="press grid h-9 w-9 flex-none place-items-center rounded-[11px] bg-sunk text-ink-3 no-underline"
                  aria-label={`Edit ${entry.account.name}`}
                >
                  <Icon name="pencil" size={15} />
                </a>
              </div>
            ),
          )
        )}
      </div>

      {props.accounts.length > 0 ? (
        <p class="mt-4 px-5 text-[11px] text-ink-3">
          Total in {props.baseCurrency}:{" "}
          <span class="tnum">
            {displayMoney(
              { minor: total, currency: props.baseCurrency },
              { decimals: "never" },
            )}
          </span>
        </p>
      ) : null}

      <div class="px-5 pt-6">
        <p class="label mb-2">Add an account</p>
        <Editor
          account={null}
          currencies={props.currencies}
          baseCurrency={props.baseCurrency}
          index={0}
        />
      </div>

      {props.archived.length === 0 ? null : (
        <div class="px-5 pt-6">
          <p class="label mb-2">Archived</p>
          <div class="card overflow-hidden">
            {props.archived.map((account) => (
              <div class="ledger-row">
                <span class="glyph glyph-flat">
                  <Icon name="archive" size={17} />
                </span>
                <span class="min-w-0 flex-1">
                  <b class="block text-[13px] font-bold">{account.name}</b>
                  <span class="text-[10.5px] text-ink-3">
                    Hidden, history kept
                  </span>
                </span>
                <form method="post" action="/accounts/restore">
                  <input type="hidden" name="id" value={account.id} />
                  <button
                    type="submit"
                    class="press flex items-center gap-1.5 text-[12px] font-semibold tracking-[-0.01em] text-money"
                  >
                    <Icon name="undo" size={14} />
                    Restore
                  </button>
                </form>
              </div>
            ))}
          </div>
        </div>
      )}
    </Shell>
  );
}

function Editor(props: {
  account: Account | null;
  currencies: ReadonlyArray<string>;
  baseCurrency: string;
  index: number;
}) {
  const { account } = props;
  const isNew = account === null;

  return (
    <form
      method="post"
      action="/accounts"
      class="card rise p-4"
      style={`--i:${props.index}`}
      autocomplete="off"
    >
      {isNew ? null : <input type="hidden" name="id" value={account.id} />}

      <div class="flex items-center gap-3">
        <input
          type="text"
          name="name"
          value={account?.name ?? ""}
          placeholder="Account name"
          required
          class="min-w-0 flex-1 bg-transparent text-[14px] font-bold tracking-[-0.015em] text-ink outline-none placeholder:font-normal placeholder:text-ink-4"
        />
        <select
          name="currency"
          class="tnum flex-none rounded-tile bg-sunk px-2.5 py-1.5 text-[12px] font-bold text-ink outline-none"
        >
          {props.currencies.map((code) => (
            <option
              value={code}
              selected={code === (account?.currency ?? props.baseCurrency)}
            >
              {code}
            </option>
          ))}
        </select>
      </div>

      <div class="mt-3 flex items-center gap-2">
        <select
          name="kind"
          class="flex-1 rounded-tile bg-sunk px-2.5 py-2 text-[12px] font-bold text-ink outline-none"
        >
          {ACCOUNT_KINDS.map((kind) => (
            <option value={kind} selected={kind === (account?.kind ?? "bank")}>
              {ACCOUNT_KIND_LABEL[kind]}
            </option>
          ))}
        </select>
        <label class="flex flex-1 items-center gap-2 rounded-tile bg-sunk px-2.5 py-2">
          <span class="label flex-none">Opening</span>
          <input
            type="text"
            inputmode="decimal"
            name="openingText"
            value={
              account === null || account.openingBalanceMinor === 0
                ? ""
                : displayMoney(
                    {
                      minor: account.openingBalanceMinor,
                      currency: account.currency,
                    },
                    { symbol: false },
                  )
            }
            placeholder="0"
            class="tnum w-full min-w-0 bg-transparent text-right text-[12px] font-bold text-ink outline-none"
          />
        </label>
      </div>

      <div class="mt-3 flex gap-2">
        <button
          type="submit"
          class="press flex h-10 flex-1 items-center justify-center gap-2 rounded-[13px] bg-money-deep text-[12px] font-bold text-on-money"
        >
          <Icon name="check" size={15} />
          {isNew ? "Add account" : "Save"}
        </button>
        {isNew ? null : (
          <>
            <a
              href="/accounts"
              class="press grid h-10 w-10 flex-none place-items-center rounded-[13px] bg-sunk text-ink-3 no-underline"
              aria-label="Cancel"
            >
              <Icon name="close" size={16} />
            </a>
            <Confirm
              action="/accounts/remove"
              fields={{ id: account.id }}
              title={`Delete ${account.name}?`}
              body="If it has transactions it is archived instead, so nothing is orphaned."
              confirmLabel="Delete"
              triggerLabel={`Delete ${account.name}`}
              triggerClass="press grid h-10 w-10 flex-none place-items-center rounded-[13px] bg-over-wash text-over"
            />
          </>
        )}
      </div>
    </form>
  );
}
