import { describe, expect, it } from "bun:test";
import { MoneyErrorCode } from "@/core/error";
import { displayMoney, money, parseAmount } from "@/core/money/money";

const inr = (minor: number) => money(minor, "INR")._unsafeUnwrap();
const eur = (minor: number) => money(minor, "EUR")._unsafeUnwrap();

describe("money", () => {
  it("refuses a fractional minor unit", () => {
    expect(money(10.5, "INR")._unsafeUnwrapErr().code).toBe(
      MoneyErrorCode.INVALID_AMOUNT,
    );
  });

  it("refuses a currency it does not know", () => {
    expect(money(100, "XYZ")._unsafeUnwrapErr().code).toBe(
      MoneyErrorCode.UNKNOWN_CURRENCY,
    );
  });
});

describe("parseAmount", () => {
  it("reads what the keypad produces", () => {
    expect(parseAmount("486", "INR")._unsafeUnwrap().minor).toBe(48600);
    expect(parseAmount("8.40", "EUR")._unsafeUnwrap().minor).toBe(840);
    expect(parseAmount("8.4", "EUR")._unsafeUnwrap().minor).toBe(840);
    expect(parseAmount(".5", "EUR")._unsafeUnwrap().minor).toBe(50);
  });

  it("respects a currency with no minor unit", () => {
    expect(parseAmount("1200", "JPY")._unsafeUnwrap().minor).toBe(1200);
    expect(parseAmount("12.5", "JPY")._unsafeUnwrapErr().code).toBe(
      MoneyErrorCode.INVALID_AMOUNT,
    );
  });

  it("rejects junk instead of coercing it", () => {
    for (const input of ["", "-", "1.2.3", "12a", "abc", " "]) {
      expect(parseAmount(input, "INR").isErr()).toBe(true);
    }
  });

  it("rejects more decimals than the currency has", () => {
    expect(parseAmount("8.401", "EUR")._unsafeUnwrapErr().code).toBe(
      MoneyErrorCode.INVALID_AMOUNT,
    );
  });

  it("round-trips through display", () => {
    const parsed = parseAmount("184250", "INR")._unsafeUnwrap();
    expect(displayMoney(parsed)).toBe("₹1,84,250");
  });
});

describe("displayMoney", () => {
  it("groups rupees the Indian way and euros the western way", () => {
    expect(displayMoney(inr(18425000))).toBe("₹1,84,250");
    expect(displayMoney(eur(18425000))).toBe("€184,250");
  });

  it("hides a zero fraction but keeps a real one", () => {
    expect(displayMoney(inr(48600))).toBe("₹486");
    expect(displayMoney(eur(840))).toBe("€8.40");
    expect(displayMoney(inr(20593040))).toBe("₹2,05,930.40");
  });

  it("can be forced to show or hide decimals", () => {
    expect(displayMoney(inr(48600), { decimals: "always" })).toBe("₹486.00");
    expect(displayMoney(inr(20593040), { decimals: "never" })).toBe(
      "₹2,05,930",
    );
  });

  it("marks negatives and can be told to drop the sign", () => {
    expect(displayMoney(inr(-48600))).toBe("−₹486");
    expect(displayMoney(inr(-48600), { sign: "never" })).toBe("₹486");
    expect(displayMoney(inr(48600), { sign: "always" })).toBe("+₹486");
  });

  it("can drop the symbol for a column that carries its own", () => {
    expect(displayMoney(inr(18425000), { symbol: false })).toBe("1,84,250");
  });

  it("groups every boundary correctly", () => {
    expect(displayMoney(inr(100), { decimals: "never" })).toBe("₹1");
    expect(displayMoney(inr(100000), { decimals: "never" })).toBe("₹1,000");
    expect(displayMoney(inr(10000000), { decimals: "never" })).toBe(
      "₹1,00,000",
    );
    expect(displayMoney(inr(1000000000), { decimals: "never" })).toBe(
      "₹1,00,00,000",
    );
  });
});
