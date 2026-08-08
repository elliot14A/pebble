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
});

describe("parseAmount", () => {
  it("rejects more decimals than the currency has", () => {
    expect(parseAmount("8.401", "EUR")._unsafeUnwrapErr().code).toBe(
      MoneyErrorCode.INVALID_AMOUNT,
    );
  });
});

describe("displayMoney", () => {
  it("groups rupees the Indian way and euros the western way", () => {
    expect(displayMoney(inr(18425000))).toBe("₹1,84,250");
    expect(displayMoney(eur(18425000))).toBe("€184,250");
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
