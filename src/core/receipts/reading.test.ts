import { describe, expect, it } from "bun:test";
import { readDate, readMerchant, readReceipt } from "@/core/receipts/reading";

const TODAY = "2026-08-16";

describe("readMerchant", () => {
  it("refuses punctuation and stray characters a model coughs up", () => {
    for (const value of [".", "...", "-- --", "*", "1234", "?", "A"]) {
      expect(readMerchant(value)).toBeNull();
    }
  });
});

describe("readDate", () => {
  it("reads day-first dates, which is what Indian receipts print", () => {
    expect(readDate("14/08/2026", TODAY)).toBe("2026-08-14");
    expect(readDate("14-08-26", TODAY)).toBe("2026-08-14");
    expect(readDate("1.8.2026", TODAY)).toBe("2026-08-01");
  });

  it("refuses the future, because a receipt cannot be from tomorrow", () => {
    expect(readDate("2026-08-17", TODAY)).toBeNull();
    expect(readDate("2027-01-01", TODAY)).toBeNull();
    expect(readDate(TODAY, TODAY)).toBe(TODAY);
  });
});

describe("readReceipt", () => {
  it("digs the object out of a code fence and chatter", () => {
    const raw = [
      "Sure! Here is the receipt data:",
      "```json",
      '{"total":"₹450","merchant":"Chai Point","date":"14/08/2026","currency":"INR"}',
      "```",
      "Let me know if you need anything else.",
    ].join("\n");

    expect(readReceipt(raw, TODAY)).toEqual({
      amountText: "450",
      merchant: "Chai Point",
      occurredOn: "2026-08-14",
      currency: "INR",
    });
  });
});
