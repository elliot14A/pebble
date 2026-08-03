import { describe, expect, it } from "bun:test";
import {
  accountBalanceMinor,
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
    clientId: `c${counter}`,
    createdAt: counter,
    updatedAt: counter,
    deletedAt: null,
    ...extra,
  };
};

describe("accountBalanceMinor", () => {
  it("debits an expense and credits an income", () => {
    const rows = [tx("expense", 48600), tx("income", 100000)];
    expect(accountBalanceMinor(0, rows, "a1")).toBe(51400);
  });

  it("credits a refund back to the account", () => {
    expect(accountBalanceMinor(0, [tx("refund", 48600)], "a1")).toBe(48600);
  });

  it("moves a transfer out of one account and into the other", () => {
    const rows = [
      tx("transfer", 500000, { accountId: "a1", counterAccountId: "a2" }),
    ];
    expect(accountBalanceMinor(0, rows, "a1")).toBe(-500000);
    expect(accountBalanceMinor(0, rows, "a2")).toBe(500000);
  });

  it("leaves accounts the transaction does not name alone", () => {
    const rows = [tx("expense", 48600)];
    expect(accountBalanceMinor(9999, rows, "other")).toBe(9999);
  });

  it("lets an adjustment move the balance either way", () => {
    expect(accountBalanceMinor(0, [tx("adjustment", -2500)], "a1")).toBe(-2500);
    expect(accountBalanceMinor(0, [tx("adjustment", 2500)], "a1")).toBe(2500);
  });

  it("ignores a deleted row", () => {
    const rows = [tx("expense", 48600, { deletedAt: 1 })];
    expect(accountBalanceMinor(100000, rows, "a1")).toBe(100000);
  });

  it("starts from the opening balance", () => {
    expect(accountBalanceMinor(184250_00, [], "a1")).toBe(18425000);
  });
});

describe("netWorthMinor", () => {
  it("is unchanged by a transfer, because nothing was created or destroyed", () => {
    const rows = [
      tx("transfer", 500000, { accountId: "a1", counterAccountId: "a2" }),
    ];
    expect(netWorthMinor(100000, rows)).toBe(100000);
  });

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

  it("splits money in from money out and ignores transfers", () => {
    const rows = [
      tx("income", 9640000),
      tx("expense", 5128600),
      tx("transfer", 500000, { accountId: "a1", counterAccountId: "a2" }),
    ];
    expect(flowMinor(rows)).toEqual({ inMinor: 9640000, outMinor: 5128600 });
  });
});

describe("groupByDay", () => {
  it("puts the newest day first and carries that day's net", () => {
    const rows = [
      tx("expense", 48600, { occurredOn: "2026-08-07" }),
      tx("expense", 10000, { occurredOn: "2026-08-08" }),
      tx("income", 50000, { occurredOn: "2026-08-08" }),
    ];
    const days = groupByDay(rows);

    expect(days.map((day) => day.date)).toEqual(["2026-08-08", "2026-08-07"]);
    expect(days[0]?.netMinor).toBe(40000);
    expect(days[1]?.netMinor).toBe(-48600);
  });

  it("drops deleted rows and the days they emptied", () => {
    const rows = [tx("expense", 48600, { deletedAt: 1 })];
    expect(groupByDay(rows)).toEqual([]);
  });
});
