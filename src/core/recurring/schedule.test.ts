import { describe, expect, it } from "bun:test";
import {
  nextAfter,
  type Recurring,
  runsDueBy,
} from "@/core/recurring/schedule";

const rule = (over: Partial<Recurring> = {}): Recurring => ({
  id: "r-1",
  userId: "u-1",
  kind: "bill",
  type: "expense",
  name: "Rent",
  amountMinor: 2_500_000,
  currency: "INR",
  accountId: "acc-1",
  categoryId: null,
  every: "month",
  dayOfMonth: 5,
  nextOn: "2026-08-05",
  lastRunOn: null,
  createdAt: 0,
  archivedAt: null,
  ...over,
});

describe("nextAfter", () => {
  it("keeps a late day-of-month inside a short month", () => {
    expect(nextAfter("2026-01-31", "month", 31)).toBe("2026-02-28");
    expect(nextAfter("2028-01-31", "month", 31)).toBe("2028-02-29");
    expect(nextAfter("2026-03-31", "month", 31)).toBe("2026-04-30");
  });

  it("rolls a december monthly into the next year", () => {
    expect(nextAfter("2026-12-05", "month", 5)).toBe("2027-01-05");
  });
});

describe("runsDueBy", () => {
  it("catches up every run that was missed while nothing was running", () => {
    const missed = runsDueBy(rule({ nextOn: "2026-05-05" }), "2026-08-09");

    expect(missed).toEqual([
      "2026-05-05",
      "2026-06-05",
      "2026-07-05",
      "2026-08-05",
    ]);
  });

  it("stops at the limit rather than looping forever on a stale rule", () => {
    expect(
      runsDueBy(rule({ nextOn: "2000-01-05" }), "2026-08-09", 12).length,
    ).toBe(12);
  });
});
