import { describe, expect, it } from "bun:test";
import { MoneyErrorCode } from "@/core/error";
import { money } from "@/core/money/money";
import {
  convert,
  formatRate,
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

  it("refuses zero, negatives and junk", () => {
    for (const input of ["0", "-1", "", "abc", "1.2.3"]) {
      expect(parseRate(input).isErr()).toBe(true);
    }
  });

  it("refuses more precision than it can store", () => {
    expect(parseRate("1.123456789")._unsafeUnwrapErr().code).toBe(
      MoneyErrorCode.INVALID_AMOUNT,
    );
  });
});

describe("formatRate", () => {
  it("drops trailing zeros so a rate reads the way it was typed", () => {
    expect(formatRate(9_145_000_000)).toBe("91.45");
    expect(formatRate(83 * RATE_SCALE)).toBe("83");
    expect(formatRate(1)).toBe("0.00000001");
  });

  it("round-trips with parseRate", () => {
    for (const input of ["91.45", "0.61", "137.2", "83"]) {
      expect(formatRate(parseRate(input)._unsafeUnwrap())).toBe(input);
    }
  });
});

describe("convert", () => {
  const eurToInr = parseRate("91.45")._unsafeUnwrap();

  it("converts euros to rupees at the frozen rate", () => {
    expect(
      convert(amount(840, "EUR"), "INR", eurToInr)._unsafeUnwrap(),
    ).toEqual({
      minor: 76818,
      currency: "INR",
    });
  });

  it("crosses a currency that has no minor unit", () => {
    const jpyToInr = parseRate("0.55")._unsafeUnwrap();

    expect(
      convert(amount(1200, "JPY"), "INR", jpyToInr)._unsafeUnwrap(),
    ).toEqual({
      minor: 66000,
      currency: "INR",
    });
  });

  it("is a no-op when the currencies already match", () => {
    const same = amount(48600, "INR");
    expect(convert(same, "INR", 1)._unsafeUnwrap()).toBe(same);
  });

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

  it("reports a missing rate rather than inventing one", () => {
    expect(convert(amount(840, "EUR"), "INR", 0)._unsafeUnwrapErr().code).toBe(
      MoneyErrorCode.MISSING_RATE,
    );
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

  it("never borrows another currency's rate", () => {
    expect(rateOn(rates, "GBP", "2026-08-12")).toBeNull();
  });

  it("returns null before the first rate was ever set", () => {
    expect(rateOn(rates, "EUR", "2026-01-01")).toBeNull();
  });
});
