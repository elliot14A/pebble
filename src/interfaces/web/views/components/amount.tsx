import { CURRENCIES, displayMoney, type FormatOptions } from "@/core/money";

const symbolOf = (code: string): string => CURRENCIES[code]?.symbol ?? code;

export type AmountProps = Readonly<{
  minor: number;
  currency: string;

  baseMinor?: number | null;
  baseCurrency?: string;
  size?: "row" | "hero" | "tile" | "inline";
  tone?: "ink" | "money" | "over" | "move";
  options?: FormatOptions;
}>;

const SIZE: Readonly<Record<NonNullable<AmountProps["size"]>, string>> = {
  hero: "text-[34px] leading-none tracking-[-0.05em]",
  tile: "text-lg tracking-[-0.035em]",
  row: "text-sm",
  inline: "text-xs",
};

const TONE: Readonly<Record<NonNullable<AmountProps["tone"]>, string>> = {
  ink: "text-ink",
  money: "text-money",
  over: "text-over",
  move: "text-move",
};

export function Amount(props: AmountProps) {
  const size = props.size ?? "row";
  const tone = props.tone ?? "ink";
  const foreign =
    props.baseCurrency !== undefined && props.currency !== props.baseCurrency;

  return (
    <span class="block text-right">
      <span class={`amt block ${SIZE[size]} ${TONE[tone]}`}>
        {displayMoney(
          { minor: props.minor, currency: props.currency },
          props.options,
        )}
      </span>
      {foreign ? (
        props.baseMinor === null || props.baseMinor === undefined ? (
          <span class="amt-sub block text-warn">
            {`${symbolOf(props.baseCurrency ?? "INR")}?`}
          </span>
        ) : (
          <span class="amt-sub block">
            {displayMoney(
              {
                minor: props.baseMinor,
                currency: props.baseCurrency ?? "INR",
              },
              { decimals: "never", sign: "never" },
            )}
          </span>
        )
      ) : null}
    </span>
  );
}
