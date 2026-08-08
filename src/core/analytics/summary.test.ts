import { describe, expect, it } from "bun:test";
import {
  byCategory,
  monthsEnding,
  topWithRest,
  totalOf,
} from "@/core/analytics/summary";
import type {
  Transaction,
  TransactionType,
} from "@/core/transactions/transaction";

let counter = 0;

const tx = (
  type: TransactionType,
  baseAmountMinor: number | null,
  extra: Partial<Transaction> = {},
): Transaction => {
  counter += 1;
  return {
    id: String(counter).padStart(4, "0"),
    userId: "u1",
    walletId: null,
    accountId: "a1",
    counterAccountId: null,
    categoryId: "food",
    merchantId: null,
    type,
    amountMinor: baseAmountMinor ?? 0,
    currency: "INR",
    baseAmountMinor,
    fxRateE8: null,
    fxPending: baseAmountMinor === null,
    occurredOn: "2026-08-08",
    note: "Swiggy",
    clientId: `c${counter}`,
    createdAt: counter,
    updatedAt: counter,
    deletedAt: null,
    ...extra,
  };
};

describe("byCategory", () => {
  it("nets refunds against the category they came from", () => {
    const buckets = byCategory([
      tx("expense", 200000, { categoryId: "food" }),
      tx("refund", 50000, { categoryId: "food" }),
      tx("expense", 30000, { categoryId: "fuel" }),
    ]);

    expect(buckets).toEqual([
      { key: "food", minor: 150000 },
      { key: "fuel", minor: 30000 },
    ]);
  });

  it("ignores income, transfers and rows still waiting on a rate", () => {
    const buckets = byCategory([
      tx("income", 900000, { categoryId: "salary" }),
      tx("transfer", 500000, { counterAccountId: "a2", categoryId: null }),
      tx("expense", null, { categoryId: "food" }),
    ]);

    expect(buckets).toEqual([]);
  });
});

describe("topWithRest", () => {
  const buckets = [
    { key: "a", minor: 500 },
    { key: "b", minor: 400 },
    { key: "c", minor: 300 },
    { key: "d", minor: 200 },
  ];

  it("keeps the total honest whichever way it splits", () => {
    expect(totalOf(topWithRest(buckets, 2))).toBe(totalOf(buckets));
  });
});

describe("monthsEnding", () => {
  it("walks back across a year boundary", () => {
    expect(monthsEnding("2026-02", 4)).toEqual([
      "2025-11",
      "2025-12",
      "2026-01",
      "2026-02",
    ]);
  });
});
