import { Icon } from "@/infra/web/views/components/icons";

export type AppBarProps = Readonly<{
  greeting: string;
  name: string;
  subtitle: string;
  initial: string;
  alert?: boolean;
}>;

export function AppBar(props: AppBarProps) {
  return (
    <header class="flex items-center justify-between gap-3 px-5 pt-4 pb-3.5">
      <a href="/profile" class="press flex items-center gap-2.5 no-underline">
        <span class="grid h-8 w-8 flex-none place-items-center rounded-full border border-money-edge bg-money-wash text-xs font-bold text-money-deep">
          {props.initial}
        </span>
        <span>
          <b class="block text-[13px] leading-tight font-bold tracking-[-0.01em]">
            {props.greeting}, {props.name}
          </b>
          <span class="text-[10.5px] tracking-[0.04em] text-ink-3">
            {props.subtitle}
          </span>
        </span>
      </a>
      <a
        href="/settings"
        class="relative grid h-[34px] w-[34px] place-items-center rounded-[11px] border border-line bg-surface text-ink-2"
        aria-label="Settings"
      >
        <Icon name="gear" size={18} />
        <span
          data-outbox
          hidden
          class="absolute -bottom-5 right-0 whitespace-nowrap text-[10px] text-warn"
        />
        {props.alert ? (
          <span class="absolute top-[7px] right-2 h-1.5 w-1.5 rounded-full border-[1.5px] border-surface bg-warn" />
        ) : null}
      </a>
    </header>
  );
}
