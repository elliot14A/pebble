import type { Account } from "@/core/accounts/account";
import type { Category } from "@/core/categories/category";
import { displayMoney } from "@/core/money/money";
import { formatRate } from "@/core/rates/rate";
import type { Receipt } from "@/core/receipts/receipt";
import type { Transaction } from "@/core/transactions/transaction";
import { Icon } from "@/infra/web/views/components/icons";
import { Shell } from "@/infra/web/views/layouts/shell";
import { Confirm } from "@/infra/web/views/partials/confirm";
import { dayLabel } from "@/infra/web/views/partials/dayGroup";

export type TransactionPageProps = Readonly<{
  transaction: Transaction;
  category: Category | null;
  account: Account | null;
  counterAccount: Account | null;
  baseCurrency: string;
  today: string;
  receipts: ReadonlyArray<Receipt>;
}>;

const TYPE_LABEL: Readonly<Record<string, string>> = {
  expense: "Expense",
  income: "Income",
  transfer: "Transfer",
  refund: "Refund",
  adjustment: "Adjustment",
};

export function TransactionPage(props: TransactionPageProps) {
  const { transaction: tx } = props;
  const credit = tx.type === "income" || tx.type === "refund";
  const named = tx.note?.trim() ?? "";
  const foreign = tx.currency !== props.baseCurrency;

  return (
    <Shell title={named === "" ? "Transaction" : named} tab="none">
      <div class="flex items-center justify-between gap-3 px-5 pt-4 pb-2">
        <a
          href="/ledger"
          class="press grid h-[34px] w-[34px] place-items-center rounded-[11px] border border-line bg-surface text-ink-2 no-underline"
          aria-label="Back to the ledger"
        >
          <Icon name="back" size={18} />
        </a>
        <span class="label">{TYPE_LABEL[tx.type] ?? "Transaction"}</span>
        <span class="w-[34px]" />
      </div>

      <div class="rise px-5 pt-3 pb-6 text-center">
        <span class="glyph mx-auto mb-3.5 h-14 w-14 rounded-[19px]">
          <Icon name={props.category?.glyph ?? "dots"} size={26} />
        </span>
        <div
          class={`amt text-[38px] leading-none tracking-[-0.06em] ${
            tx.type === "transfer"
              ? "text-move"
              : credit
                ? "text-money"
                : "text-over"
          }`}
        >
          {displayMoney(
            {
              minor: credit ? tx.amountMinor : -tx.amountMinor,
              currency: tx.currency,
            },
            tx.type === "transfer"
              ? { sign: "never" }
              : credit
                ? { sign: "always" }
                : {},
          )}
        </div>
        {foreign ? (
          <div class="amt-sub mt-1.5 text-[13px]">
            {tx.baseAmountMinor === null
              ? "No rate set yet"
              : `${displayMoney({
                  minor: tx.baseAmountMinor,
                  currency: props.baseCurrency,
                })}  ·  1 ${tx.currency} = ${
                  tx.fxRateE8 === null ? "?" : formatRate(tx.fxRateE8)
                }`}
          </div>
        ) : null}
        {named === "" ? null : (
          <p class="mt-3 text-[12.5px] font-bold">{named}</p>
        )}
        <p class="label mt-1">{dayLabel(tx.occurredOn, props.today)}</p>
      </div>

      <div class="card rise mx-5 overflow-hidden" style="--i:1">
        <Line
          label="Category"
          value={props.category?.name ?? "Uncategorised"}
        />
        <Line label="Account" value={props.account?.name ?? "Unknown"} />
        {props.counterAccount === null ? null : (
          <Line label="To" value={props.counterAccount.name} />
        )}
        <Line label="Date" value={tx.occurredOn} />
        {named === "" ? null : <Line label="Name" value={named} />}
      </div>

      {tx.fxPending ? (
        <a
          href="/settings/currencies"
          class="press rise mx-5 mt-3 block rounded-card bg-warn-wash p-3.5 text-[12px] text-ink-2 no-underline"
          style="--i:2"
        >
          <b class="block text-[12.5px] text-ink">No {tx.currency} rate yet</b>
          Set one and this fills in automatically.
        </a>
      ) : null}

      <div class="rise mx-5 mt-4 flex gap-2.5" style="--i:3">
        <form
          method="post"
          action={`/transactions/${tx.id}/repeat`}
          class="flex-1"
        >
          <button
            type="submit"
            class="press card flex h-[52px] w-full items-center justify-center gap-2 text-[13px] font-bold text-ink"
          >
            Repeat today
          </button>
        </form>
        <Confirm
          action={`/transactions/${tx.id}/delete`}
          fields={{}}
          title="Delete this transaction?"
          body="It leaves the ledger straight away, and you can undo it for a few seconds afterwards."
          confirmLabel="Delete"
          triggerLabel="Delete this transaction"
        />
      </div>

      <div class="rise mx-5 mt-5" style="--i:4">
        <Receipts
          receipts={props.receipts}
          transactionId={props.transaction.id}
        />
      </div>
    </Shell>
  );
}

function Line(props: { label: string; value: string }) {
  return (
    <div class="ledger-row">
      <span class="label flex-none basis-[90px]">{props.label}</span>
      <span class="flex-1 text-[13px] font-bold tracking-[-0.015em]">
        {props.value}
      </span>
    </div>
  );
}

function Receipts(props: {
  receipts: ReadonlyArray<Receipt>;
  transactionId: string;
}) {
  return (
    <div class="mb-3">
      <p class="label mb-2">Receipt</p>

      {props.receipts.length === 0 ? (
        <form
          method="post"
          action="/receipts/scan"
          enctype="multipart/form-data"
          class="card p-3"
        >
          <input
            type="hidden"
            name="transactionId"
            value={props.transactionId}
          />
          <label class="press flex cursor-pointer items-center gap-3">
            <span class="glyph h-10 w-10 flex-none rounded-[13px]">
              <Icon name="camera" size={17} />
            </span>
            <span class="min-w-0 flex-1 text-[12.5px] font-semibold text-ink-2">
              Attach a photo
            </span>
            <input
              type="file"
              name="photo"
              accept="image/*"
              capture="environment"
              class="sr-only"
              onchange="this.form.submit()"
            />
          </label>
        </form>
      ) : (
        props.receipts.map((receipt) => (
          <div class="card overflow-hidden">
            <a
              href={`/receipts/${receipt.id}`}
              target="_blank"
              rel="noreferrer"
            >
              <img
                src={`/receipts/${receipt.id}`}
                alt="The receipt"
                class="block max-h-[320px] w-full object-contain bg-sunk"
              />
            </a>
            <form
              method="post"
              action={`/receipts/${receipt.id}/remove`}
              class="p-3"
            >
              <input
                type="hidden"
                name="back"
                value={`/transactions/${props.transactionId}`}
              />
              <button
                type="submit"
                class="press flex h-9 w-full items-center justify-center gap-2 rounded-[12px] bg-over-wash text-[12px] font-semibold text-over"
              >
                <Icon name="trash" size={14} />
                Remove receipt
              </button>
            </form>
          </div>
        ))
      )}
    </div>
  );
}
