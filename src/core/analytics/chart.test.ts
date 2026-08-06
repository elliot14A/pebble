import { describe, expect, it } from "bun:test";
import { arcs, barHeight, maxOf, shareOf } from "@/core/analytics/chart";

describe("arcs", () => {
  it("fills exactly one circle", () => {
    const drawn = arcs([1, 2, 1], 100);
    const total = drawn.reduce((sum, arc) => sum + arc.length, 0);

    expect(total).toBeCloseTo(100, 6);
    expect(drawn.map((arc) => arc.length)).toEqual([25, 50, 25]);
  });

  it("starts each arc where the last one ended", () => {
    expect(arcs([1, 1, 2], 100).map((arc) => arc.offset)).toEqual([
      -0, -25, -50,
    ]);
  });

  it("leaves the rest of the circle as the gap", () => {
    const [first] = arcs([1, 3], 100);
    expect(first?.gap).toBe(75);
  });

  it("draws nothing when there is nothing to draw", () => {
    expect(arcs([], 100)).toEqual([]);
    expect(arcs([0, 0], 100)).toEqual([]);
  });
});

describe("barHeight", () => {
  it("scales against the tallest bar", () => {
    expect(barHeight(50, 100, 80)).toBe(40);
    expect(barHeight(100, 100, 80)).toBe(80);
  });

  it("is flat rather than infinite on an empty chart", () => {
    expect(barHeight(0, 0, 80)).toBe(0);
  });
});

describe("maxOf", () => {
  it("finds the tallest, and is zero when empty", () => {
    expect(maxOf([3, 9, 4])).toBe(9);
    expect(maxOf([])).toBe(0);
  });
});

describe("shareOf", () => {
  it("rounds to whole percent and survives a zero total", () => {
    expect(shareOf(25, 100)).toBe(25);
    expect(shareOf(1, 3)).toBe(33);
    expect(shareOf(5, 0)).toBe(0);
  });
});
