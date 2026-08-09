import { describe, expect, it } from "bun:test";
import {
  flowMinor,
  groupByDay,
  netWorthMinor,
} from "@/core/transactions/balance";
import type {
  Transaction,
  TransactionType,
} from "@/core/transactions/transaction";

let counter = 0;

const tx = (
  type: TransactionType,
  amountMinor: number,
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
    amountMinor,
    currency: "INR",
    baseAmountMinor: amountMinor,
    fxRateE8: null,
    fxPending: false,
    occurredOn: "2026-08-08",
    note: null,
    tags: null,
    clientId: `c${counter}`,
    createdAt: counter,
    updatedAt: counter,
    deletedAt: null,
    ...extra,
  };
};

describe("netWorthMinor", () => {
  it("counts a foreign expense at its frozen base amount, not its face value", () => {
    const rows = [
      tx("expense", 840, { currency: "EUR", baseAmountMinor: 76818 }),
    ];
    expect(netWorthMinor(0, rows)).toBe(-76818);
  });

  it("skips a row whose rate is still missing rather than guessing", () => {
    const rows = [
      tx("expense", 2100, {
        currency: "EUR",
        baseAmountMinor: null,
        fxPending: true,
      }),
    ];
    expect(netWorthMinor(100000, rows)).toBe(100000);
  });
});

describe("flowMinor", () => {
  it("takes a refund off what was spent, not onto what was earned", () => {
    const rows = [tx("expense", 200000), tx("refund", 50000)];
    expect(flowMinor(rows)).toEqual({ inMinor: 0, outMinor: 150000 });
  });
});

describe("groupByDay", () => {
  it("drops deleted rows and the days they emptied", () => {
    const rows = [tx("expense", 48600, { deletedAt: 1 })];
    expect(groupByDay(rows)).toEqual([]);
  });
});
