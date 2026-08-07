import { describe, expect, it } from "bun:test";
import {
  dailyLeftMinor,
  daysInMonth,
  elapsedBps,
  isOnPace,
  progress,
  projectedMinor,
  stateOf,
  usedBps,
} from "@/core/budgets/budget";

describe("usedBps", () => {
  it("is zero when there is no limit to divide by", () => {
    expect(usedBps(5000, 0)).toBe(0);
    expect(usedBps(5000, -100)).toBe(0);
  });

  it("counts past a hundred percent rather than clamping", () => {
    expect(usedBps(15_000, 10_000)).toBe(15_000);
  });
});

describe("stateOf", () => {
  it("turns close at eighty percent and over past a hundred", () => {
    expect(stateOf(7999)).toBe("ok");
    expect(stateOf(8000)).toBe("close");
    expect(stateOf(10_000)).toBe("close");
    expect(stateOf(10_001)).toBe("over");
  });
});

describe("progress", () => {
  it("reports what is left, and how far past when overspent", () => {
    expect(progress(500_000, 200_000)).toEqual({
      limitMinor: 500_000,
      spentMinor: 200_000,
      leftMinor: 300_000,
      usedBps: 4000,
      state: "ok",
    });

    const over = progress(500_000, 620_000);
    expect(over.leftMinor).toBe(-120_000);
    expect(over.state).toBe("over");
  });
});

describe("daysInMonth", () => {
  it("knows the short months and leap years", () => {
    expect(daysInMonth("2026-02")).toBe(28);
    expect(daysInMonth("2028-02")).toBe(29);
    expect(daysInMonth("2026-04")).toBe(30);
    expect(daysInMonth("2026-12")).toBe(31);
  });
});

describe("elapsedBps", () => {
  it("is nothing before the month and everything after", () => {
    expect(elapsedBps("2026-08", "2026-07-31")).toBe(0);
    expect(elapsedBps("2026-08", "2026-09-01")).toBe(10_000);
  });

  it("counts the day through the month", () => {
    expect(elapsedBps("2026-08", "2026-08-31")).toBe(10_000);
    expect(elapsedBps("2026-08", "2026-08-16")).toBe(5161);
  });
});

describe("projectedMinor", () => {
  it("scales the run rate out to the whole month", () => {
    expect(projectedMinor(100_000, "2026-08", "2026-08-10")).toBe(310_000);
  });

  it("leaves a finished month alone", () => {
    expect(projectedMinor(100_000, "2026-07", "2026-08-10")).toBe(100_000);
  });
});

describe("dailyLeftMinor", () => {
  it("spreads what is left over the days still to come, today included", () => {
    expect(dailyLeftMinor(100_000, "2026-08", "2026-08-27")).toBe(20_000);
  });

  it("gives nothing to spend when already over", () => {
    expect(dailyLeftMinor(-5000, "2026-08", "2026-08-27")).toBe(0);
  });

  it("says nothing at all for a month that is not now", () => {
    expect(dailyLeftMinor(100_000, "2026-07", "2026-08-27")).toBeNull();
  });
});

describe("isOnPace", () => {
  it("compares spending against how much of the month has gone", () => {
    expect(isOnPace(4000, "2026-08", "2026-08-16")).toBe(true);
    expect(isOnPace(9000, "2026-08", "2026-08-16")).toBe(false);
  });
});
