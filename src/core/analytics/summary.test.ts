import { describe, expect, it } from "bun:test";
import {
  byCategory,
  byMerchant,
  byMonth,
  byWeekday,
  monthsEnding,
  spendByMonth,
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

  it("drops a category refunded back to nothing rather than showing zero", () => {
    const buckets = byCategory([
      tx("expense", 50000, { categoryId: "food" }),
      tx("refund", 50000, { categoryId: "food" }),
    ]);

    expect(buckets).toEqual([]);
  });

  it("ignores deleted rows", () => {
    expect(byCategory([tx("expense", 50000, { deletedAt: 1 })])).toEqual([]);
  });
});

describe("byMerchant", () => {
  it("groups by name, biggest first", () => {
    const buckets = byMerchant([
      tx("expense", 10000, { note: "Swiggy" }),
      tx("expense", 90000, { note: "DMart" }),
      tx("expense", 20000, { note: "Swiggy" }),
    ]);

    expect(buckets).toEqual([
      { key: "DMart", minor: 90000 },
      { key: "Swiggy", minor: 30000 },
    ]);
  });

  it("skips unnamed rows rather than inventing a blank merchant", () => {
    expect(byMerchant([tx("expense", 10000, { note: "  " })])).toEqual([]);
  });
});

describe("byMonth", () => {
  it("splits money in from money out, month by month", () => {
    const flows = byMonth(
      [
        tx("income", 900000, { occurredOn: "2026-07-04" }),
        tx("expense", 200000, { occurredOn: "2026-07-20" }),
        tx("expense", 50000, { occurredOn: "2026-08-02" }),
      ],
      ["2026-07", "2026-08"],
    );

    expect(flows).toEqual([
      { month: "2026-07", inMinor: 900000, outMinor: 200000 },
      { month: "2026-08", inMinor: 0, outMinor: 50000 },
    ]);
  });

  it("keeps a month with no activity so the chart has no gaps", () => {
    expect(byMonth([], ["2026-06", "2026-07"])).toEqual([
      { month: "2026-06", inMinor: 0, outMinor: 0 },
      { month: "2026-07", inMinor: 0, outMinor: 0 },
    ]);
  });

  it("leaves a transfer out of both sides", () => {
    expect(
      byMonth(
        [tx("transfer", 500000, { counterAccountId: "a2" })],
        ["2026-08"],
      ),
    ).toEqual([{ month: "2026-08", inMinor: 0, outMinor: 0 }]);
  });
});

describe("spendByMonth", () => {
  it("totals spend per month and keeps the empty ones", () => {
    expect(
      spendByMonth(
        [
          tx("expense", 30000, { occurredOn: "2026-07-04" }),
          tx("expense", 20000, { occurredOn: "2026-07-20" }),
        ],
        ["2026-06", "2026-07", "2026-08"],
      ),
    ).toEqual([
      { key: "2026-06", minor: 0 },
      { key: "2026-07", minor: 50000 },
      { key: "2026-08", minor: 0 },
    ]);
  });

  it("nets refunds inside the month they belong to", () => {
    expect(
      spendByMonth(
        [
          tx("expense", 30000, { occurredOn: "2026-08-04" }),
          tx("refund", 10000, { occurredOn: "2026-08-09" }),
        ],
        ["2026-08"],
      ),
    ).toEqual([{ key: "2026-08", minor: 20000 }]);
  });
});

describe("byWeekday", () => {
  it("totals spending per day of the week, Sunday first", () => {
    // 2026-08-08 is a Saturday, 2026-08-09 a Sunday.
    const days = byWeekday([
      tx("expense", 10000, { occurredOn: "2026-08-08" }),
      tx("expense", 30000, { occurredOn: "2026-08-09" }),
    ]);

    expect(days[6]).toBe(10000);
    expect(days[0]).toBe(30000);
    expect(days[3]).toBe(0);
  });
});

describe("topWithRest", () => {
  const buckets = [
    { key: "a", minor: 500 },
    { key: "b", minor: 400 },
    { key: "c", minor: 300 },
    { key: "d", minor: 200 },
  ];

  it("folds the tail into one bucket", () => {
    expect(topWithRest(buckets, 2)).toEqual([
      { key: "a", minor: 500 },
      { key: "b", minor: 400 },
      { key: "rest", minor: 500 },
    ]);
  });

  it("changes nothing when everything already fits", () => {
    expect(topWithRest(buckets, 9)).toEqual(buckets);
  });

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

  it("ends on the month it was given", () => {
    expect(monthsEnding("2026-08", 1)).toEqual(["2026-08"]);
  });
});
