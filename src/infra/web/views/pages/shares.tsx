import { formatDay, isLive, type Share, spanLabel } from "@/core/shares/share";
import { Icon } from "@/infra/web/views/components/icons";
import { Shell } from "@/infra/web/views/layouts/shell";
import { Confirm } from "@/infra/web/views/partials/confirm";

export type SharesPageProps = Readonly<{
  shares: ReadonlyArray<Share>;
  origin: string;
  today: string;
  now: number;
  notice: string | null;
  error: string | null;
}>;

const field =
  "rounded-tile bg-sunk px-2.5 py-2 text-[12px] font-semibold text-ink outline-none";

const SPANS = [
  ["day", "Today"],
  ["week", "This week"],
  ["month", "This month"],
  ["range", "Custom"],
] as const;

const EXPIRIES = [
  ["7", "7 days"],
  ["30", "30 days"],
  ["0", "Never"],
] as const;

export function SharesPage(props: SharesPageProps) {
  const fresh = props.shares.find((share) => share.token === props.notice);

  return (
    <Shell
      title="Shares"
      tab="none"
      notice={props.notice === "revoked" ? "Link revoked." : null}
    >
      <div class="flex items-center justify-between gap-3 px-5 pt-4 pb-2">
        <a
          href="/settings"
          class="press grid h-9 w-9 place-items-center rounded-[11px] bg-sunk text-ink-2 no-underline"
          aria-label="Back to settings"
        >
          <Icon name="back" size={17} />
        </a>
        <span class="label">Shares</span>
        <span class="h-9 w-9" />
      </div>

      <div class="px-5 pt-1 pb-4">
        <h1 class="text-[21px] font-bold tracking-[-0.035em]">Shares</h1>
      </div>

      {props.error === null ? null : (
        <p class="pop mx-5 mb-3 rounded-tile bg-over-wash px-4 py-3 text-[12px] text-over">
          {props.error}
        </p>
      )}

      {fresh === undefined ? null : (
        <div class="pop mx-5 mb-4 rounded-tile bg-money-wash p-4">
          <p class="label mb-1.5 text-money-deep">Copy this link</p>
          <div class="flex gap-2" x-data="shareLink">
            <input
              type="text"
              readonly
              value={`${props.origin}/s/${fresh.token}`}
              x-ref="url"
              class={`${field} min-w-0 flex-1 bg-paper`}
            />
            <button
              type="button"
              x-on:click="copy()"
              class="press grid h-[38px] w-[38px] flex-none place-items-center rounded-[13px] bg-money-deep text-on-money"
              aria-label="Copy link"
            >
              <Icon name="check" size={15} />
            </button>
          </div>
        </div>
      )}

      <div class="px-5 pb-2">
        <p class="label mb-2">New link</p>
        <form
          method="post"
          action="/shares"
          class="card grid gap-2.5 p-4"
          x-data="{ span: 'month' }"
        >
          <div class="grid grid-cols-4 gap-2">
            {SPANS.map(([value, label]) => (
              <label class="contents">
                <input
                  type="radio"
                  name="span"
                  value={value}
                  checked={value === "month"}
                  x-model="span"
                  class="peer sr-only"
                />
                <span class="press grid h-9 cursor-pointer place-items-center rounded-[11px] bg-sunk text-[11px] font-semibold text-ink-2 peer-checked:bg-ink peer-checked:text-paper">
                  {label}
                </span>
              </label>
            ))}
          </div>

          <div class="grid grid-cols-2 gap-2" x-show="span === 'range'" x-cloak>
            <input type="date" name="from" max={props.today} class={field} />
            <input type="date" name="to" max={props.today} class={field} />
          </div>

          <div class="grid grid-cols-2 gap-2">
            <input
              type="text"
              name="label"
              placeholder="Name it, for you"
              maxlength={60}
              class={field}
            />
            <select name="expiresInDays" class={field}>
              {EXPIRIES.map(([value, label]) => (
                <option value={value} selected={value === "30"}>
                  Expires in {label}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            class="press mt-1 flex h-11 items-center justify-center gap-2 rounded-[14px] bg-money-deep text-[12.5px] font-bold text-on-money"
          >
            <Icon name="plus" size={15} />
            Create link
          </button>
        </form>
      </div>

      <div class="grid gap-3 px-5 pt-5">
        {props.shares.length === 0 ? (
          <p class="py-6 text-center text-[11.5px] text-ink-3">No links yet.</p>
        ) : (
          props.shares.map((share, index) => {
            const live = isLive(share, props.now);
            return (
              <div class="card rise p-4" style={`--i:${index}`}>
                <div class="flex items-start gap-3">
                  <span class="min-w-0 flex-1">
                    <b class="block truncate text-[13px] font-bold tracking-[-0.015em]">
                      {share.label === "" ? spanLabel(share) : share.label}
                    </b>
                    <span class="text-[10.5px] text-ink-3">
                      {spanLabel(share)}
                      {` · ${share.viewCount} ${share.viewCount === 1 ? "view" : "views"}`}
                      {live
                        ? share.expiresAt === null
                          ? ""
                          : ` · until ${formatDay(new Date(share.expiresAt).toISOString().slice(0, 10))}`
                        : share.revokedAt === null
                          ? " · expired"
                          : " · revoked"}
                    </span>
                  </span>
                  {live ? (
                    <Confirm
                      action="/shares/revoke"
                      fields={{ id: share.id }}
                      title="Revoke this link?"
                      body="Anyone holding it stops seeing your spending."
                      confirmLabel="Revoke"
                      triggerLabel="Revoke this link"
                      triggerClass="press grid h-9 w-9 flex-none place-items-center rounded-[11px] bg-over-wash text-over"
                    />
                  ) : null}
                </div>

                {live ? (
                  <div class="mt-3 flex gap-2" x-data="shareLink">
                    <input
                      type="text"
                      readonly
                      value={`${props.origin}/s/${share.token}`}
                      x-ref="url"
                      class={`${field} min-w-0 flex-1`}
                    />
                    <button
                      type="button"
                      x-on:click="copy()"
                      class="press rounded-[13px] bg-sunk px-3 text-[12px] font-semibold text-ink-2"
                    >
                      Copy
                    </button>
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </div>
    </Shell>
  );
}
