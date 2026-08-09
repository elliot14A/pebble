import { describe, expect, it } from "bun:test";
import { byCategory, topWithRest, totalOf } from "@/core/analytics/summary";
import type { Transaction, TransactionType } from "@/core/transactions";

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
    tags: null,
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
