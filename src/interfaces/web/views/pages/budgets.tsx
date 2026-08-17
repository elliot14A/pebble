import type { BudgetLine, BudgetOverview } from "@/app/budgets";
import { displayMoney } from "@/core/money";
import { Icon } from "@/interfaces/web/views/components/icons";
import { Shell } from "@/interfaces/web/views/layouts/shell";
import { Confirm } from "@/interfaces/web/views/partials/confirm";

export type BudgetsPageProps = Readonly<{
  data: BudgetOverview;
  baseCurrency: string;
  notice: string | null;
  error: string | null;
}>;

const field =
  "rounded-tile bg-sunk px-2.5 py-2 text-[12px] font-semibold text-ink outline-none";

const BAR: Readonly<Record<string, string>> = {
  ok: "bg-money-deep",
  close: "bg-warn",
  over: "bg-over",
};

const TEXT: Readonly<Record<string, string>> = {
  ok: "text-ink",
  close: "text-warn",
  over: "text-over",
};

export function BudgetsPage(props: BudgetsPageProps) {
  const { data } = props;
  const money = (minor: number): string =>
    displayMoney(
      { minor, currency: props.baseCurrency },
      { decimals: "never" },
    );

  const spent = new Set(data.lines.map((line) => line.budget.categoryId));
  const unbudgeted = data.categories.filter(
    (category) => category.kind !== "income" && !spent.has(category.id),
  );

  return (
    <Shell title="Budgets" tab="none" notice={props.notice}>
      <div class="flex items-center justify-between gap-3 px-5 pt-4 pb-2">
        <a
          href="/"
          class="press grid h-9 w-9 place-items-center rounded-[11px] bg-sunk text-ink-2 no-underline"
          aria-label="Back"
        >
          <Icon name="back" size={17} />
        </a>
        <span class="label">Budgets</span>
        <span class="h-9 w-9" />
      </div>

      <div class="px-5 pt-1 pb-4">
        <h1 class="text-[21px] font-bold tracking-[-0.035em]">Budgets</h1>
      </div>

      {props.error === null ? null : (
        <p class="pop mx-5 mb-3 rounded-tile bg-over-wash px-4 py-3 text-[12px] text-over">
          {props.error}
        </p>
      )}

      <section class="px-5">
        {data.overall === null ? (
          <form
            method="post"
            action="/budgets"
            class="card flex gap-2 p-4"
            autocomplete="off"
          >
            <input type="hidden" name="categoryId" value="" />
            <input
              type="text"
              name="amountText"
              inputmode="decimal"
              placeholder="Monthly limit for everything"
              required
              class={`${field} min-w-0 flex-1`}
            />
            <button
              type="submit"
              class="press grid h-[38px] w-[38px] flex-none place-items-center rounded-[13px] bg-money-deep text-on-money"
              aria-label="Set the overall budget"
            >
              <Icon name="check" size={15} />
            </button>
          </form>
        ) : (
          <Overall line={data.overall} money={money} data={data} />
        )}
      </section>

      <section class="px-5 pt-5">
        <p class="label mb-2">By category</p>
        {data.lines.length === 0 ? (
          <p class="card py-6 text-center text-[11.5px] text-ink-3">
            Nothing set yet.
          </p>
        ) : (
          <div class="grid gap-3">
            {data.lines.map((line, index) => (
              <Line line={line} money={money} index={index} />
            ))}
          </div>
        )}
      </section>

      {unbudgeted.length === 0 ? null : (
        <section class="px-5 pt-5 pb-2">
          <p class="label mb-2">Add one</p>
          <form
            method="post"
            action="/budgets"
            class="card grid gap-2.5 p-4"
            autocomplete="off"
          >
            <select name="categoryId" class={field}>
              {unbudgeted.map((category) => (
                <option value={category.id}>{category.name}</option>
              ))}
            </select>
            <div class="flex gap-2">
              <input
                type="text"
                name="amountText"
                inputmode="decimal"
                placeholder="Monthly limit"
                required
                class={`${field} min-w-0 flex-1`}
              />
              <button
                type="submit"
                class="press rounded-[13px] bg-money-deep px-4 text-[12px] font-bold text-on-money"
              >
                Set
              </button>
            </div>
          </form>
        </section>
      )}
    </Shell>
  );
}

function Bar(props: { usedBps: number; state: string; elapsedBps?: number }) {
  return (
    <span class="relative mt-2.5 block h-2 overflow-hidden rounded-full bg-sunk">
      <span
        class={`block h-full rounded-full ${BAR[props.state] ?? "bg-money-deep"}`}
        style={`width:${Math.min(props.usedBps / 100, 100)}%`}
      />
      {props.elapsedBps === undefined ? null : (
        <span
          class="absolute top-0 h-full w-px bg-ink-3"
          style={`left:${Math.min(props.elapsedBps / 100, 100)}%`}
        />
      )}
    </span>
  );
}

function Overall(props: {
  line: BudgetLine;
  data: BudgetOverview;
  money: (minor: number) => string;
}) {
  const { line, money } = props;

  return (
    <div class="card rise p-4">
      <div class="flex items-baseline justify-between gap-3">
        <span class="label">This month</span>
        <Confirm
          action="/budgets/remove"
          fields={{ id: line.budget.id }}
          title="Remove this budget?"
          body="The spending stays, only the limit goes."
          confirmLabel="Remove"
          triggerLabel="Remove the overall budget"
          triggerClass="press grid h-7 w-7 place-items-center rounded-[9px] bg-over-wash text-over"
        />
      </div>

      <b
        class={`amt mt-2 block text-[26px] tracking-[-0.04em] ${TEXT[line.progress.state] ?? ""}`}
      >
        {money(line.progress.spentMinor)}
      </b>
      <span class="text-[11.5px] text-ink-3">
        of {money(line.progress.limitMinor)}
      </span>

      <Bar
        usedBps={line.progress.usedBps}
        state={line.progress.state}
        elapsedBps={props.data.elapsedBps}
      />

      <div class="mt-3 grid grid-cols-3 gap-3">
        <div>
          <span class="label">
            {line.progress.leftMinor < 0 ? "Over by" : "Left"}
          </span>
          <b class="amt mt-1 block text-[13px] tracking-[-0.03em]">
            {money(Math.abs(line.progress.leftMinor))}
          </b>
        </div>
        <div>
          <span class="label">A day</span>
          <b class="amt mt-1 block text-[13px] tracking-[-0.03em]">
            {line.dailyLeftMinor === null ? "—" : money(line.dailyLeftMinor)}
          </b>
        </div>
        <div>
          <span class="label">Heading for</span>
          <b
            class={`amt mt-1 block text-[13px] tracking-[-0.03em] ${
              line.projectedMinor > line.progress.limitMinor ? "text-over" : ""
            }`}
          >
            {money(line.projectedMinor)}
          </b>
        </div>
      </div>
    </div>
  );
}

function Line(props: {
  line: BudgetLine;
  index: number;
  money: (minor: number) => string;
}) {
  const { line, money } = props;

  return (
    <div class="card rise p-4" style={`--i:${props.index}`}>
      <div class="flex items-center gap-3">
        <span class="glyph h-9 w-9 flex-none rounded-[12px]">
          <Icon name={line.category?.glyph ?? "dots"} size={16} />
        </span>
        <span class="min-w-0 flex-1">
          <b class="block truncate text-[13px] font-bold tracking-[-0.015em]">
            {line.category?.name ?? "Removed category"}
          </b>
          <span class="tnum text-[10.5px] text-ink-3">
            {money(line.progress.spentMinor)} of{" "}
            {money(line.progress.limitMinor)}
          </span>
        </span>
        <span class="flex items-center gap-2">
          <b
            class={`tnum text-[12px] font-bold ${TEXT[line.progress.state] ?? ""}`}
          >
            {Math.round(line.progress.usedBps / 100)}%
          </b>
          <Confirm
            action="/budgets/remove"
            fields={{ id: line.budget.id }}
            title={`Remove the ${line.category?.name ?? ""} budget?`}
            body="The spending stays, only the limit goes."
            confirmLabel="Remove"
            triggerLabel="Remove this budget"
            triggerClass="press grid h-7 w-7 flex-none place-items-center rounded-[9px] bg-over-wash text-over"
          />
        </span>
      </div>

      <Bar usedBps={line.progress.usedBps} state={line.progress.state} />
    </div>
  );
}
