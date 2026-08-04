import { Icon } from "@/infra/web/views/components/icons";

export type TabBarProps = Readonly<{
  active: "home" | "ledger" | "stats" | "money" | "none";
}>;

type Tab = Readonly<{ key: string; href: string; icon: string; label: string }>;

const TABS: ReadonlyArray<Tab> = [
  { key: "home", href: "/", icon: "home", label: "Home" },
  { key: "ledger", href: "/ledger", icon: "list", label: "Ledger" },
  { key: "stats", href: "/analytics", icon: "chart", label: "Stats" },
  { key: "money", href: "/accounts", icon: "wallet", label: "Money" },
];

export function TabBar(props: TabBarProps) {
  const [first, second, third, fourth] = TABS;
  return (
    <nav
      class="fixed inset-x-0 bottom-0 z-20 mx-auto flex max-w-[520px] items-center justify-around border-t border-line-soft bg-surface px-3 pt-2.5 pb-[calc(1.625rem+env(safe-area-inset-bottom,0px))]"
      aria-label="Sections"
    >
      {[first, second].map((tab) => (
        <TabLink tab={tab} active={props.active} />
      ))}

      <button
        type="button"
        class="-mt-7 grid h-[54px] w-[54px] place-items-center rounded-[19px] border-[3px] border-paper bg-money-deep text-on-money shadow-lift transition-transform duration-150 ease-pebble active:scale-95"
        x-on:click="$dispatch('pebble-open')"
        aria-label="Add a transaction"
      >
        <Icon name="plus" size={22} />
      </button>

      {[third, fourth].map((tab) => (
        <TabLink tab={tab} active={props.active} />
      ))}
    </nav>
  );
}

function TabLink(props: { tab: Tab | undefined; active: string }) {
  const { tab } = props;
  if (tab === undefined) return null;
  const on = tab.key === props.active;
  return (
    <a
      href={tab.href}
      class={`press grid w-14 justify-items-center gap-1 text-[10px] font-semibold tracking-[-0.01em] no-underline ${
        on ? "text-money" : "text-ink-4"
      }`}
      aria-current={on ? "page" : undefined}
    >
      <Icon name={tab.icon} size={19} />
      {tab.label}
    </a>
  );
}
