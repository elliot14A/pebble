import { describe, expect, it } from "bun:test";
import { dailyLeftMinor, projectedMinor, stateOf } from "@/core/budgets/budget";

describe("stateOf", () => {
  it("turns close at eighty percent and over past a hundred", () => {
    expect(stateOf(7999)).toBe("ok");
    expect(stateOf(8000)).toBe("close");
    expect(stateOf(10_000)).toBe("close");
    expect(stateOf(10_001)).toBe("over");
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
