import { raw } from "hono/html";
import {
  ICON_NAMES,
  ICONS,
  type IconName,
} from "@/infra/web/views/components/icons.generated";

export type { IconName };

export const isIconName = (value: string): value is IconName =>
  (ICON_NAMES as ReadonlyArray<string>).includes(value);

export function IconSprite() {
  return (
    <svg width="0" height="0" class="absolute" aria-hidden="true">
      <defs>
        {ICON_NAMES.map((name) => (
          <g
            id={`i-${name}`}
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            {raw(ICONS[name])}
          </g>
        ))}
      </defs>
    </svg>
  );
}

export type IconProps = Readonly<{
  name: string;
  size?: number;
  class?: string;
}>;

export function Icon(props: IconProps) {
  const size = props.size ?? 18;
  const name = isIconName(props.name) ? props.name : "dots";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      class={props.class ?? ""}
      aria-hidden="true"
    >
      <use href={`#i-${name}`} />
    </svg>
  );
}
