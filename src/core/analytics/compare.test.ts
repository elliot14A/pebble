import { describe, expect, it } from "bun:test";
import { changeBps, compareBuckets } from "@/core/analytics/compare";

describe("changeBps", () => {
  it("refuses to express growth from nothing as a percentage", () => {
    expect(changeBps(500, 0)).toBeNull();
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
});
