import { describe, expect, it } from "bun:test";
import {
  backspace,
  display,
  empty,
  fromText,
  isReady,
  press,
  withDecimals,
} from "@/infra/client/core/keypad";

const type = (keys: string, decimals = 2) =>
  [...keys].reduce((keypad, key) => press(keypad, key), empty(decimals));

describe("keypad", () => {
  it("builds an amount digit by digit", () => {
    expect(display(type("486"))).toBe("486");
  });

  it("shows a zero rather than nothing when empty", () => {
    expect(display(empty(2))).toBe("0");
  });

  it("allows one decimal point and no more", () => {
    expect(display(type("8.40"))).toBe("8.40");
    expect(display(type("8.4.0"))).toBe("8.40");
  });

  it("stops at the currency's number of decimals", () => {
    expect(display(type("8.401"))).toBe("8.40");
  });

  it("refuses a decimal point for a currency that has none", () => {
    expect(display(type("12.5", 0))).toBe("125");
  });

  it("opens a bare point as 0.", () => {
    expect(display(type(".5"))).toBe("0.5");
  });

  it("replaces a lone leading zero instead of growing it", () => {
    expect(display(type("05"))).toBe("5");
  });

  it("deletes the last character", () => {
    expect(display(backspace(type("486")))).toBe("48");
    expect(display(backspace(empty(2)))).toBe("0");
  });

  it("is ready only once a real amount is entered", () => {
    expect(isReady(empty(2))).toBe(false);
    expect(isReady(type("0"))).toBe(false);
    expect(isReady(type("."))).toBe(false);
    expect(isReady(type("1"))).toBe(true);
  });

  it("truncates when the account switches to a coarser currency", () => {
    expect(display(withDecimals(type("8.40"), 0))).toBe("8");
    expect(display(withDecimals(type("8.40"), 2))).toBe("8.40");
  });
});

describe("fromText", () => {
  it("takes a plain amount", () => {
    expect(fromText("1234.50", 2)).toEqual({ text: "1234.50", decimals: 2 });
    expect(fromText("450", 2)).toEqual({ text: "450", decimals: 2 });
  });

  it("throws away anything that is not a digit or a point", () => {
    expect(fromText("₹1,234.50", 2).text).toBe("1234.50");
  });

  it("cuts the fraction down to what the currency allows", () => {
    expect(fromText("10.999", 2).text).toBe("10.99");
    expect(fromText("10.99", 0).text).toBe("10");
  });

  it("keeps only the first point", () => {
    expect(fromText("1.2.3", 2).text).toBe("1.23");
  });
});
