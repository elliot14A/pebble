import { describe, expect, it } from "bun:test";
import { money } from "@/core/money/money";
import {
  convert,
  parseRate,
  RATE_SCALE,
  type Rate,
  rateOn,
} from "@/core/rates/rate";

const amount = (minor: number, currency: string) =>
  money(minor, currency)._unsafeUnwrap();

describe("parseRate", () => {
  it("scales a typed rate to an integer", () => {
    expect(parseRate("91.45")._unsafeUnwrap()).toBe(9_145_000_000);
    expect(parseRate("83")._unsafeUnwrap()).toBe(83 * RATE_SCALE);
  });
});

describe("convert", () => {
  const eurToInr = parseRate("91.45")._unsafeUnwrap();

  it("keeps the sign and rounds half away from zero", () => {
    const half = parseRate("0.5")._unsafeUnwrap();
    expect(convert(amount(1, "EUR"), "INR", half)._unsafeUnwrap().minor).toBe(
      1,
    );
    expect(convert(amount(-1, "EUR"), "INR", half)._unsafeUnwrap().minor).toBe(
      -1,
    );
  });

  it("stays exact where a double would already have drifted", () => {
    const big = amount(999_999_999, "EUR");
    const converted = convert(big, "INR", eurToInr)._unsafeUnwrap();
    expect(Number.isSafeInteger(converted.minor)).toBe(true);
    expect(converted.minor).toBe(91_449_999_909);
  });
});

describe("rateOn", () => {
  const rates: ReadonlyArray<Rate> = [
    { currency: "EUR", rateE8: 1, effectiveFrom: "2026-06-01" },
    { currency: "EUR", rateE8: 2, effectiveFrom: "2026-08-10" },
    { currency: "USD", rateE8: 3, effectiveFrom: "2026-08-10" },
  ];

  it("takes the newest rate effective on or before the date", () => {
    expect(rateOn(rates, "EUR", "2026-08-12")?.rateE8).toBe(2);
    expect(rateOn(rates, "EUR", "2026-08-10")?.rateE8).toBe(2);
    expect(rateOn(rates, "EUR", "2026-07-01")?.rateE8).toBe(1);
  });
});
