import { describe, expect, it } from "bun:test";
import {
  NOTHING,
  readAmount,
  readCurrency,
  readDate,
  readMerchant,
  readReceipt,
} from "@/core/receipts/reading";

const TODAY = "2026-08-16";

describe("readAmount", () => {
  it("strips symbols and thousands separators", () => {
    expect(readAmount("₹1,234.50")).toBe("1234.50");
    expect(readAmount("Rs. 2,300")).toBe("2300");
    expect(readAmount("$45.99")).toBe("45.99");
  });

  it("reads the European comma as a decimal point", () => {
    expect(readAmount("1.234,56")).toBe("1234.56");
    expect(readAmount("12,50")).toBe("12.50");
  });

  it("treats a three digit group as thousands, not decimals", () => {
    expect(readAmount("1,234")).toBe("1234");
    expect(readAmount("12.345")).toBe("12345");
  });

  it("refuses nothing, zero and rubbish", () => {
    expect(readAmount("")).toBeNull();
    expect(readAmount("N/A")).toBeNull();
    expect(readAmount("unknown")).toBeNull();
    expect(readAmount("0")).toBeNull();
    expect(readAmount("0.00")).toBeNull();
    expect(readAmount("abc")).toBeNull();
    expect(readAmount(null)).toBeNull();
  });

  it("takes a plain number too", () => {
    expect(readAmount(450)).toBe("450");
  });
});

describe("readMerchant", () => {
  it("collapses whitespace and caps the length", () => {
    expect(readMerchant("  Big   Bazaar \n")).toBe("Big Bazaar");
    expect(readMerchant("x".repeat(60))?.length).toBe(40);
  });

  it("refuses the model's ways of saying it could not tell", () => {
    for (const value of ["", "N/A", "unknown", "not visible", "-"]) {
      expect(readMerchant(value)).toBeNull();
    }
  });

  it("refuses punctuation and stray characters a model coughs up", () => {
    for (const value of [".", "...", "-- --", "*", "1234", "?", "A"]) {
      expect(readMerchant(value)).toBeNull();
    }
  });

  it("keeps a real name that happens to carry digits", () => {
    expect(readMerchant("Cafe 24")).toBe("Cafe 24");
    expect(readMerchant("7-Eleven")).toBe("7-Eleven");
  });
});

describe("readDate", () => {
  it("takes an ISO date", () => {
    expect(readDate("2026-08-14", TODAY)).toBe("2026-08-14");
  });

  it("reads day-first dates, which is what Indian receipts print", () => {
    expect(readDate("14/08/2026", TODAY)).toBe("2026-08-14");
    expect(readDate("14-08-26", TODAY)).toBe("2026-08-14");
    expect(readDate("1.8.2026", TODAY)).toBe("2026-08-01");
  });

  it("refuses a date that never happened", () => {
    expect(readDate("2026-02-30", TODAY)).toBeNull();
    expect(readDate("2026-13-01", TODAY)).toBeNull();
  });

  it("refuses the future, because a receipt cannot be from tomorrow", () => {
    expect(readDate("2026-08-17", TODAY)).toBeNull();
    expect(readDate("2027-01-01", TODAY)).toBeNull();
    expect(readDate(TODAY, TODAY)).toBe(TODAY);
  });

  it("refuses what it cannot parse", () => {
    expect(readDate("14th August", TODAY)).toBeNull();
    expect(readDate("", TODAY)).toBeNull();
  });
});

describe("readCurrency", () => {
  it("wants exactly three letters", () => {
    expect(readCurrency("inr")).toBe("INR");
    expect(readCurrency("USD")).toBe("USD");
    expect(readCurrency("₹")).toBeNull();
    expect(readCurrency("RUPEES")).toBeNull();
  });
});

describe("readReceipt", () => {
  it("reads a clean reply", () => {
    const raw =
      '{"total":"1234.50","merchant":"Big Bazaar","date":"2026-08-14","currency":"INR"}';

    expect(readReceipt(raw, TODAY)).toEqual({
      amountText: "1234.50",
      merchant: "Big Bazaar",
      occurredOn: "2026-08-14",
      currency: "INR",
    });
  });

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

  it("keeps the fields it can read and drops the ones it cannot", () => {
    const raw =
      '{"total":"450","merchant":"","date":"not visible","currency":"blah"}';

    expect(readReceipt(raw, TODAY)).toEqual({
      amountText: "450",
      merchant: null,
      occurredOn: null,
      currency: null,
    });
  });

  it("gives up quietly on a reply with no JSON at all", () => {
    expect(readReceipt("I cannot read this image.", TODAY)).toEqual(NOTHING);
    expect(readReceipt("", TODAY)).toEqual(NOTHING);
    expect(readReceipt("{ broken", TODAY)).toEqual(NOTHING);
  });

  it("accepts the other key names the model reaches for", () => {
    const raw = '{"amount":"99","name":"Cafe","occurredOn":"2026-08-10"}';

    expect(readReceipt(raw, TODAY)).toEqual({
      amountText: "99",
      merchant: "Cafe",
      occurredOn: "2026-08-10",
      currency: null,
    });
  });
});
