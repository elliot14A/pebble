import type { User } from "@/core/users";
import { Icon } from "@/infra/web/views/components/icons";
import { Shell } from "@/infra/web/views/layouts/shell";

export type SettingsPageProps = Readonly<{
  user: User;
  currencyCount: number;
  userCount: number;
  shareCount: number;
  categoryCount: number;
  repeatingCount: number;
  goalCount: number;
  notice: string | null;
}>;

export function SettingsPage(props: SettingsPageProps) {
  return (
    <Shell title="Settings" tab="none" notice={props.notice}>
      <div class="px-5 pt-5 pb-4">
        <h1 class="text-[21px] font-bold tracking-[-0.035em]">Settings</h1>
      </div>

      <div class="grid gap-3 px-5">
        <Row
          href="/settings/currencies"
          icon="swap"
          title="Currencies"
          detail={
            props.currencyCount === 0
              ? `Just ${props.user.baseCurrency}`
              : `${props.user.baseCurrency} and ${props.currencyCount} more`
          }
        />
        {props.user.role === "super_admin" ? (
          <Row
            href="/admin/users"
            icon="users"
            title="People"
            detail={
              props.userCount === 1
                ? "1 account"
                : `${props.userCount} accounts`
            }
          />
        ) : null}
        <Row
          href="/settings/categories"
          icon="dots"
          title="Categories"
          detail={`${props.categoryCount} in use`}
        />
        <Row
          href="/settings/goals"
          icon="target"
          title="Goals"
          detail={
            props.goalCount === 0
              ? "Save toward something"
              : `${props.goalCount} on the go`
          }
        />
        <Row
          href="/settings/repeating"
          icon="calendar"
          title="Repeating"
          detail={
            props.repeatingCount === 0
              ? "Bills and subscriptions"
              : `${props.repeatingCount} set up`
          }
        />
        <Row
          href="/settings/import"
          icon="receipt"
          title="Import a statement"
          detail="Fill the ledger from your bank's csv"
        />
        <Row
          href="/export.csv?span=month"
          icon="receipt"
          title="Export this month"
          detail="A spreadsheet of every entry"
        />
        <Row
          href="/shares"
          icon="swap"
          title="Shares"
          detail={
            props.shareCount === 0
              ? "None"
              : props.shareCount === 1
                ? "1 link"
                : `${props.shareCount} links`
          }
        />
        <Row
          href="/profile"
          icon="user"
          title="You"
          detail={props.user.username}
        />
      </div>
    </Shell>
  );
}

function Row(props: {
  href: string;
  icon: string;
  title: string;
  detail: string;
}) {
  return (
    <a
      href={props.href}
      class="card press rise flex items-center gap-3.5 p-4 text-ink no-underline"
    >
      <span class="glyph h-[42px] w-[42px] flex-none rounded-[13px]">
        <Icon name={props.icon} size={19} />
      </span>
      <span class="min-w-0 flex-1">
        <b class="block text-[13px] font-bold tracking-[-0.015em]">
          {props.title}
        </b>
        <span class="text-[10.5px] text-ink-3">{props.detail}</span>
      </span>
      <Icon name="arrow" size={16} />
    </a>
  );
}
