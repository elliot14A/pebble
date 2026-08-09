import { displayMoney } from "@/core/money";
import type { DayGroup as Day } from "@/core/transactions";
import {
  type LedgerLookups,
  LedgerRow,
} from "@/infra/web/views/partials/ledgerRow";

export type DayGroupProps = Readonly<{
  day: Day;
  lookups: LedgerLookups;
  today: string;
  freshId?: string | null;

  oob?: boolean;
}>;

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

export const dayLabel = (date: string, today: string): string => {
  if (date === today) return "Today";

  const parsed = new Date(`${date}T00:00:00Z`);
  const yesterday = new Date(`${today}T00:00:00Z`);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  if (parsed.getTime() === yesterday.getTime()) return "Yesterday";

  const weekday = WEEKDAYS[parsed.getUTCDay()] ?? "";
  const month = MONTHS[parsed.getUTCMonth()] ?? "";
  return `${weekday} ${parsed.getUTCDate()} ${month}`;
};

export function DayGroup(props: DayGroupProps) {
  const { day } = props;
  return (
    <section
      id={`day-${day.date}`}
      class="rise"
      data-day={day.date}
      {...(props.oob ? { "hx-swap-oob": "true" } : {})}
    >
      <header class="sticky top-0 z-10 flex items-center gap-2.5 bg-paper px-0.5 pt-4 pb-2">
        <b class="text-[12px] font-bold tracking-[-0.01em]">
          {dayLabel(day.date, props.today)}
        </b>
        <span class="h-px flex-1 bg-line" />
        <span
          class={`tnum text-[11px] ${
            day.netMinor === 0
              ? "text-ink-3"
              : day.netMinor > 0
                ? "text-money"
                : "text-over"
          }`}
        >
          {displayMoney(
            { minor: day.netMinor, currency: props.lookups.baseCurrency },
            { decimals: "never", sign: "always" },
          )}
        </span>
      </header>
      <div class="card overflow-hidden">
        {day.transactions.map((transaction, index) => (
          <LedgerRow
            transaction={transaction}
            lookups={props.lookups}
            fresh={transaction.id === props.freshId}
            index={index}
          />
        ))}
      </div>
    </section>
  );
}
