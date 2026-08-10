import { describe, expect, it } from "bun:test";
import { byCategory } from "@/core/analytics";
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
      tx("expense", 200_000, { categoryId: "food" }),
      tx("refund", 50_000, { categoryId: "food" }),
      tx("expense", 30_000, { categoryId: "fuel" }),
    ]);

    expect(buckets).toEqual([
      { key: "food", minor: 150_000 },
      { key: "fuel", minor: 30_000 },
    ]);
  });
});
