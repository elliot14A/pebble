import { initials, type User } from "@/core/users/user";
import { Icon } from "@/infra/web/views/components/icons";
import { Shell } from "@/infra/web/views/layouts/shell";
import { Confirm } from "@/infra/web/views/partials/confirm";

export type ProfilePageProps = Readonly<{
  user: User;
  baseCurrency: string;
  transactionCount: number;
  accountCount: number;
  joinedLabel: string;
  notice: string | null;
  error: string | null;
}>;

export function ProfilePage(props: ProfilePageProps) {
  const { user } = props;

  return (
    <Shell title="You" tab="none" notice={props.notice}>
      <div class="flex items-center justify-between gap-3 px-5 pt-4 pb-2">
        <a
          href="/"
          class="press grid h-9 w-9 place-items-center rounded-[11px] bg-sunk text-ink-2 no-underline"
          aria-label="Back"
        >
          <Icon name="back" size={17} />
        </a>
        <span class="label">You</span>
        <a
          href="/settings"
          class="press grid h-9 w-9 place-items-center rounded-[11px] bg-sunk text-ink-2 no-underline"
          aria-label="Settings"
        >
          <Icon name="gear" size={17} />
        </a>
      </div>

      <div class="rise flex flex-col items-center px-5 pt-4 pb-6">
        <span class="grid h-[68px] w-[68px] place-items-center rounded-full border border-money-edge bg-money-wash text-[24px] font-bold text-money-deep">
          {initials(user)}
        </span>
        <b class="mt-3 text-[19px] font-bold tracking-[-0.035em]">
          {user.displayName}
        </b>
        <span class="mt-0.5 text-[11.5px] text-ink-3">
          {user.username}
          {user.role === "super_admin" ? " · admin" : ""}
          {` · joined ${props.joinedLabel}`}
        </span>
      </div>

      {props.error === null ? null : (
        <p class="pop mx-5 mb-3 rounded-tile bg-over-wash px-4 py-3 text-[12px] text-over">
          {props.error}
        </p>
      )}

      <div class="rise grid grid-cols-3 gap-3 px-5" style="--i:1">
        <Stat value={String(props.transactionCount)} label="entries" />
        <Stat value={String(props.accountCount)} label="accounts" />
        <Stat value={props.baseCurrency} label="base" />
      </div>

      <div class="px-5 pt-6">
        <p class="label mb-2">Your name</p>
        <form
          method="post"
          action="/profile"
          class="card rise flex gap-2 p-3"
          style="--i:2"
        >
          <input
            type="text"
            name="displayName"
            value={user.displayName}
            required
            maxlength={40}
            class="min-w-0 flex-1 rounded-tile bg-sunk px-3 py-2.5 text-[13px] font-semibold text-ink outline-none"
          />
          <button
            type="submit"
            class="press grid h-[42px] w-[42px] flex-none place-items-center rounded-[13px] bg-money-deep text-on-money"
            aria-label="Save your name"
          >
            <Icon name="check" size={16} />
          </button>
        </form>
      </div>

      <div class="grid gap-3 px-5 pt-5">
        <a
          href="/password"
          class="card press flex items-center gap-3 p-4 no-underline"
        >
          <span class="glyph h-10 w-10 flex-none rounded-[13px]">
            <Icon name="key" size={17} />
          </span>
          <span class="min-w-0 flex-1">
            <b class="block text-[13px] font-bold tracking-[-0.015em]">
              Your password
            </b>
            <span class="text-[10.5px] text-ink-3">Change it</span>
          </span>
          <Icon name="arrow" size={16} />
        </a>
      </div>

      <div class="px-5 pt-5">
        <Confirm
          action="/logout"
          fields={{}}
          title="Sign out?"
          body="You will need your password to get back in."
          cancelLabel="Stay"
          confirmLabel="Sign out"
          confirmIcon="signout"
          triggerLabel="Sign out"
          triggerIcon="signout"
          triggerClass="press flex h-11 w-full items-center justify-center gap-2 rounded-[14px] bg-over-wash text-[12.5px] font-semibold text-over"
          triggerText="Sign out"
        />
      </div>
    </Shell>
  );
}

function Stat(props: { value: string; label: string }) {
  return (
    <div class="card p-3.5 text-center">
      <b class="amt block text-[17px] tracking-[-0.035em]">{props.value}</b>
      <span class="mt-0.5 block text-[10.5px] text-ink-3">{props.label}</span>
    </div>
  );
}
