import { describe, expect, it } from "bun:test";
import {
  dailyLeftMinor,
  daysInMonth,
  projectedMinor,
  stateOf,
} from "@/core/budgets/budget";

describe("stateOf", () => {
  it("turns close at eighty percent and over past a hundred", () => {
    expect(stateOf(7999)).toBe("ok");
    expect(stateOf(8000)).toBe("close");
    expect(stateOf(10_000)).toBe("close");
    expect(stateOf(10_001)).toBe("over");
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

describe("projectedMinor", () => {
  it("scales the run rate out to the whole month", () => {
    expect(projectedMinor(100_000, "2026-08", "2026-08-10")).toBe(310_000);
  });
});

describe("dailyLeftMinor", () => {
  it("spreads what is left over the days still to come, today included", () => {
    expect(dailyLeftMinor(100_000, "2026-08", "2026-08-27")).toBe(20_000);
  });
});
