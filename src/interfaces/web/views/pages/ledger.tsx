import type { Child } from "hono/jsx";
import type { Filter } from "@/interfaces/web/routes/transactions/query";
import { Icon } from "@/interfaces/web/views/components/icons";
import { Shell } from "@/interfaces/web/views/layouts/shell";
import {
  QuickAdd,
  type QuickAddProps,
} from "@/interfaces/web/views/partials/quickAdd";

export type LedgerPageProps = Readonly<{
  list: Child;
  count: number;
  search: string;
  activeFilters: ReadonlyArray<Filter>;
  undoId: string | null;
  quickAdd: QuickAddProps;
}>;

export function LedgerPage(props: LedgerPageProps) {
  return (
    <Shell
      title="Ledger"
      tab="ledger"
      undoId={props.undoId}
      sheet={<QuickAdd {...props.quickAdd} onLedger />}
    >
      <div class="px-5 pt-5 pb-3.5">
        <h1 class="text-[21px] font-bold tracking-[-0.035em]">Ledger</h1>
        <p id="ledger-count" class="mt-0.5 text-[11.5px] text-ink-3">
          {props.count === 1 ? "1 transaction" : `${props.count} transactions`}
        </p>
      </div>

      <form action="/ledger" method="get" class="px-5 pb-3">
        <label class="flex items-center gap-2.5 rounded-full bg-surface px-4 py-2.5 text-ink-3 shadow-card">
          <Icon name="search" size={16} />
          <input
            type="search"
            name="q"
            value={props.search}
            placeholder="Search a note or merchant"
            class="min-w-0 flex-1 bg-transparent text-[12.5px] text-ink outline-none placeholder:text-ink-3"
            autocomplete="off"
          />
        </label>
      </form>

      {props.activeFilters.length > 0 ? (
        <div class="scroll-y flex gap-2 overflow-x-auto px-5 pb-2">
          {props.activeFilters.map((filter) => (
            <a href={filter.href} class="chip chip-money no-underline">
              {filter.label}
              <Icon name="close" size={12} />
            </a>
          ))}
        </div>
      ) : null}

      {props.list}
    </Shell>
  );
}
