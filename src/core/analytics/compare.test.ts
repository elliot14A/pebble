import { describe, expect, it } from "bun:test";
import { change, changeBps, compareBuckets } from "@/core/analytics/compare";

describe("changeBps", () => {
  it("reads a rise and a fall in basis points", () => {
    expect(changeBps(150, 100)).toBe(5000);
    expect(changeBps(50, 100)).toBe(-5000);
    expect(changeBps(100, 100)).toBe(0);
  });

  it("refuses to express growth from nothing as a percentage", () => {
    expect(changeBps(500, 0)).toBeNull();
  });

  it("calls a drop to nothing minus one hundred percent", () => {
    expect(changeBps(0, 400)).toBe(-10000);
  });
});

describe("change", () => {
  it("carries both sides and the difference", () => {
    expect(change("food", 700, 500)).toEqual({
      key: "food",
      nowMinor: 700,
      thenMinor: 500,
      deltaMinor: 200,
      deltaBps: 4000,
    });
  });
});

describe("compareBuckets", () => {
  const now = [
    { key: "food", minor: 700 },
    { key: "fuel", minor: 100 },
    { key: "rent", minor: 2400 },
  ];
  const then = [
    { key: "food", minor: 500 },
    { key: "fuel", minor: 900 },
    { key: "rent", minor: 2400 },
  ];

  it("puts the biggest mover first, whichever way it moved", () => {
    expect(compareBuckets(now, then).map((c) => c.key)).toEqual([
      "fuel",
      "food",
    ]);
  });

  it("drops anything that did not move", () => {
    expect(compareBuckets(now, then).map((c) => c.key)).not.toContain("rent");
  });

  it("keeps a category that only appears on one side", () => {
    const started = compareBuckets([{ key: "gym", minor: 300 }], []);
    expect(started).toEqual([
      {
        key: "gym",
        nowMinor: 300,
        thenMinor: 0,
        deltaMinor: 300,
        deltaBps: null,
      },
    ]);

    const stopped = compareBuckets([], [{ key: "gym", minor: 300 }]);
    expect(stopped[0]?.deltaMinor).toBe(-300);
    expect(stopped[0]?.deltaBps).toBe(-10000);
  });

  it("has nothing to say when both months match", () => {
    expect(compareBuckets(now, now)).toEqual([]);
  });
});
