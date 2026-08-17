import type { DayGroup as Day } from "@/core/transactions";
import { DayGroup } from "@/interfaces/web/views/partials/dayGroup";
import type { LedgerLookups } from "@/interfaces/web/views/partials/ledgerRow";

export type LedgerListProps = Readonly<{
  days: ReadonlyArray<Day>;
  lookups: LedgerLookups;
  today: string;
  moreHref: string | null;
  refreshHref: string;
  search: string;
  emptyBecauseSearch: boolean;
  append: boolean;
}>;

export function LedgerList(props: LedgerListProps) {
  const body = (
    <>
      {props.days.map((day) => (
        <DayGroup day={day} lookups={props.lookups} today={props.today} />
      ))}

      {props.moreHref === null ? null : (
        <button
          type="button"
          class="press card mt-4 flex h-11 w-full items-center justify-center text-[12px] font-semibold text-ink-2"
          hx-get={props.moreHref}
          hx-target="this"
          hx-swap="outerHTML"
        >
          Load more
        </button>
      )}
    </>
  );

  if (props.append) return body;

  return (
    <div
      id="ledger"
      class="px-5"
      hx-get={props.refreshHref}
      hx-trigger="pebble:saved from:body"
      hx-target="this"
      hx-swap="outerHTML"
    >
      {props.days.length === 0 ? (
        <div class="card pop mt-4 p-8 text-center">
          <p class="text-[13px] font-bold">Nothing here</p>
          <p class="mt-1.5 text-[11.5px] text-ink-3">
            {props.emptyBecauseSearch
              ? `No transaction matches "${props.search}".`
              : "Log something and it will show up."}
          </p>
        </div>
      ) : (
        body
      )}
    </div>
  );
}
