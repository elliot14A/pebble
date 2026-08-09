import {
  daysLeft,
  type Goal,
  isReached,
  leftMinor,
  perMonthMinor,
  usedBps,
} from "@/core/goals";
import { displayMoney } from "@/core/money";
import { Icon } from "@/infra/web/views/components/icons";
import { Shell } from "@/infra/web/views/layouts/shell";
import { Confirm } from "@/infra/web/views/partials/confirm";

export type GoalsPageProps = Readonly<{
  goals: ReadonlyArray<Goal>;
  baseCurrency: string;
  today: string;
  notice: string | null;
  error: string | null;
}>;

const field =
  "rounded-tile bg-sunk px-2.5 py-2 text-[12px] font-semibold text-ink outline-none";

export function GoalsPage(props: GoalsPageProps) {
  const money = (minor: number, currency: string): string =>
    displayMoney({ minor, currency }, { decimals: "never" });

  return (
    <Shell title="Goals" tab="none" notice={props.notice}>
      <div class="flex items-center justify-between gap-3 px-5 pt-4 pb-2">
        <a
          href="/settings"
          class="press grid h-9 w-9 place-items-center rounded-[11px] bg-sunk text-ink-2 no-underline"
          aria-label="Back to settings"
        >
          <Icon name="back" size={17} />
        </a>
        <span class="label">Goals</span>
        <span class="h-9 w-9" />
      </div>

      <div class="px-5 pt-1 pb-4">
        <h1 class="text-[21px] font-bold tracking-[-0.035em]">Goals</h1>
      </div>

      {props.error === null ? null : (
        <p class="pop mx-5 mb-3 rounded-tile bg-over-wash px-4 py-3 text-[12px] text-over">
          {props.error}
        </p>
      )}

      <div class="grid gap-3 px-5">
        {props.goals.length === 0 ? (
          <p class="card py-6 text-center text-[11.5px] text-ink-3">
            Nothing saved toward yet.
          </p>
        ) : (
          props.goals.map((goal, index) => {
            const done = isReached(goal);
            const bps = usedBps(goal);
            const days = daysLeft(goal, props.today);
            const monthly = perMonthMinor(goal, props.today);

            return (
              <div class="card rise p-4" style={`--i:${index}`}>
                <div class="flex items-start gap-3">
                  <span class="min-w-0 flex-1">
                    <b class="block truncate text-[13.5px] font-bold tracking-[-0.02em]">
                      {goal.name}
                    </b>
                    <span class="tnum text-[10.5px] text-ink-3">
                      {money(goal.savedMinor, goal.currency)} of{" "}
                      {money(goal.targetMinor, goal.currency)}
                      {days === null
                        ? ""
                        : days < 0
                          ? ` · ${Math.abs(days)} days over`
                          : ` · ${days} days left`}
                    </span>
                  </span>

                  <b
                    class={`tnum flex-none text-[12px] font-bold ${done ? "text-money-deep" : "text-ink-2"}`}
                  >
                    {Math.round(bps / 100)}%
                  </b>

                  <Confirm
                    action="/goals/remove"
                    fields={{ id: goal.id }}
                    title={`Drop ${goal.name}?`}
                    body="The goal goes, the money stays where it is."
                    confirmLabel="Drop"
                    triggerLabel={`Drop ${goal.name}`}
                    triggerClass="press grid h-8 w-8 flex-none place-items-center rounded-[10px] bg-over-wash text-over"
                  />
                </div>

                <span class="mt-2.5 block h-2 overflow-hidden rounded-full bg-sunk">
                  <span
                    class={`block h-full rounded-full ${done ? "bg-money-deep" : "bg-money"}`}
                    style={`width:${bps / 100}%`}
                  />
                </span>

                {done ? (
                  <p class="mt-2 text-[11px] font-semibold text-money-deep">
                    Got there.
                  </p>
                ) : (
                  <>
                    {monthly === null ? null : (
                      <p class="tnum mt-2 text-[10.5px] text-ink-3">
                        {money(monthly, goal.currency)} a month to make it
                      </p>
                    )}
                    <form
                      method="post"
                      action="/goals/put"
                      class="mt-2.5 flex gap-2"
                    >
                      <input type="hidden" name="id" value={goal.id} />
                      <input
                        type="text"
                        name="amountText"
                        inputmode="decimal"
                        placeholder={`Put away, ${money(leftMinor(goal), goal.currency)} to go`}
                        required
                        class={`${field} min-w-0 flex-1`}
                      />
                      <button
                        type="submit"
                        class="press rounded-[13px] bg-money-deep px-4 text-[12px] font-bold text-on-money"
                      >
                        Add
                      </button>
                    </form>
                  </>
                )}
              </div>
            );
          })
        )}
      </div>

      <div class="px-5 pt-6 pb-2">
        <p class="label mb-2">Save toward something</p>
        <form
          method="post"
          action="/goals"
          class="card grid gap-2.5 p-4"
          autocomplete="off"
        >
          <div class="grid grid-cols-2 gap-2">
            <input
              type="text"
              name="name"
              placeholder="A trip, a laptop"
              maxlength={32}
              required
              class={field}
            />
            <input
              type="text"
              name="targetText"
              inputmode="decimal"
              placeholder="How much"
              required
              class={field}
            />
          </div>
          <input type="date" name="targetOn" class={field} />
          <button
            type="submit"
            class="press mt-1 flex h-11 items-center justify-center gap-2 rounded-[14px] bg-money-deep text-[12.5px] font-bold text-on-money"
          >
            <Icon name="target" size={15} />
            Add goal
          </button>
        </form>
      </div>
    </Shell>
  );
}
