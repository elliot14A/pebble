import type { Account } from "@/core/accounts";
import type { Category, Tint } from "@/core/categories";
import type { Transaction } from "@/core/transactions";
import { Amount } from "@/interfaces/web/views/components/amount";
import { Icon } from "@/interfaces/web/views/components/icons";

export type LedgerLookups = Readonly<{
  categories: ReadonlyMap<string, Category>;
  accounts: ReadonlyMap<string, Account>;
  baseCurrency: string;
}>;

export type LedgerRowProps = Readonly<{
  transaction: Transaction;
  lookups: LedgerLookups;

  fresh?: boolean;

  index?: number;
}>;

const TINT_CLASS: Readonly<Record<Tint, string>> = {
  money: "",
  warn: "glyph-warn",
  move: "glyph-move",
  over: "glyph-over",
  flat: "glyph-flat",
};

export function LedgerRow(props: LedgerRowProps) {
  const { transaction: tx, lookups } = props;
  const category =
    tx.categoryId === null ? null : lookups.categories.get(tx.categoryId);
  const account = lookups.accounts.get(tx.accountId);
  const counter =
    tx.counterAccountId === null
      ? null
      : lookups.accounts.get(tx.counterAccountId);

  const transfer = tx.type === "transfer";
  const glyph = transfer ? "swap" : (category?.glyph ?? "dots");
  const tint = transfer ? "move" : (category?.tint ?? "flat");

  const named = tx.note?.trim() ?? "";
  const title = transfer
    ? `To ${counter?.name ?? "another account"}`
    : named !== ""
      ? named
      : (category?.name ?? "Uncategorised");

  const subtitle = transfer
    ? `${account?.name ?? "?"} → ${counter?.name ?? "?"}`
    : [account?.name, category?.name].filter(Boolean).join(" · ");

  const credit = tx.type === "income" || tx.type === "refund";

  return (
    <a
      href={`/transactions/${tx.id}`}
      class={`ledger-row press text-ink no-underline ${props.fresh ? "fresh" : ""}`}
      style={`--i:${props.index ?? 0}`}
      data-tx-id={tx.id}
    >
      <span class={`glyph ${TINT_CLASS[tint]}`}>
        <Icon name={glyph} size={18} />
      </span>
      <span class="min-w-0 flex-1">
        <span class="block truncate text-[13px] font-bold tracking-[-0.015em]">
          {title}
        </span>
        <span class="mt-px block text-[10.5px] text-ink-3">{subtitle}</span>
        {tx.fxPending ? (
          <span class="mt-1 inline-flex items-center rounded-full bg-warn-wash px-1.5 py-0.5 text-[10px] font-semibold tracking-[-0.01em] text-warn">
            No rate yet
          </span>
        ) : null}
      </span>
      <Amount
        minor={credit ? tx.amountMinor : -tx.amountMinor}
        currency={tx.currency}
        baseMinor={tx.baseAmountMinor}
        baseCurrency={lookups.baseCurrency}
        tone={transfer ? "move" : credit ? "money" : "over"}
        options={
          transfer ? { sign: "never" } : credit ? { sign: "always" } : {}
        }
      />
    </a>
  );
}
