import { Icon } from "@/interfaces/web/views/components/icons";

export type ConfirmProps = Readonly<{
  action: string;
  fields: Readonly<Record<string, string>>;
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel?: string;
  triggerLabel: string;
  triggerText?: string;
  triggerClass?: string;
  triggerIcon?: string;
  confirmIcon?: string;
}>;

export function Confirm(props: ConfirmProps) {
  return (
    <div x-data="{ asking: false }" class="contents">
      <button
        type="button"
        x-on:click="asking = true"
        class={
          props.triggerClass ??
          "press flex h-[52px] w-[52px] flex-none items-center justify-center rounded-[17px] bg-over-wash text-over"
        }
        aria-label={props.triggerLabel}
      >
        <Icon name={props.triggerIcon ?? "trash"} size={18} />
        {props.triggerText === undefined ? null : props.triggerText}
      </button>

      <template x-teleport="body">
        <div
          x-cloak
          x-show="asking"
          class="fixed inset-0 z-50 flex items-end justify-center px-4 pb-8 sm:items-center"
          role="dialog"
          aria-modal="true"
          {...{ "x-on:keydown.escape.window": "asking = false" }}
        >
          <div
            x-show="asking"
            x-transition:enter="transition ease-pebble duration-180"
            x-transition:enter-start="opacity-0"
            x-transition:enter-end="opacity-100"
            x-transition:leave="transition ease-pebble duration-150"
            x-transition:leave-start="opacity-100"
            x-transition:leave-end="opacity-0"
            class="absolute inset-0 bg-[rgb(9_17_13/0.5)]"
            x-on:click="asking = false"
          />

          <div
            x-show="asking"
            x-transition:enter="transition ease-spring duration-260"
            x-transition:enter-start="translate-y-4 opacity-0 scale-95"
            x-transition:enter-end="translate-y-0 opacity-100 scale-100"
            x-transition:leave="transition ease-pebble duration-150"
            x-transition:leave-start="opacity-100"
            x-transition:leave-end="opacity-0"
            class="card relative z-10 w-full max-w-[400px] p-5"
          >
            <span class="glyph glyph-over mb-3.5 h-11 w-11 rounded-[14px]">
              <Icon name="alert" size={20} />
            </span>
            <h2 class="text-[15px] font-bold tracking-[-0.02em]">
              {props.title}
            </h2>
            <p class="mt-1.5 text-[12.5px] text-ink-3">{props.body}</p>

            <div class="mt-5 flex gap-2.5">
              <button
                type="button"
                x-on:click="asking = false"
                class="press flex h-11 flex-1 items-center justify-center rounded-[14px] bg-sunk text-[13px] font-bold text-ink"
              >
                {props.cancelLabel ?? "Keep it"}
              </button>
              <form method="post" action={props.action} class="flex-1">
                {Object.entries(props.fields).map(([name, value]) => (
                  <input type="hidden" name={name} value={value} />
                ))}
                <button
                  type="submit"
                  class="press flex h-11 w-full items-center justify-center gap-2 rounded-[14px] bg-over text-[13px] font-bold text-white"
                >
                  <Icon name={props.confirmIcon ?? "trash"} size={16} />
                  {props.confirmLabel}
                </button>
              </form>
            </div>
          </div>
        </div>
      </template>
    </div>
  );
}
