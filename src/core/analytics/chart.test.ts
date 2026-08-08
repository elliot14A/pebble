import { describe, expect, it } from "bun:test";
import { arcs, shareOf } from "@/core/analytics/chart";

describe("arcs", () => {
  it("starts each arc where the last one ended", () => {
    expect(arcs([1, 1, 2], 100).map((arc) => arc.offset)).toEqual([
      -0, -25, -50,
    ]);
  });
});

describe("shareOf", () => {
  it("rounds to whole percent and survives a zero total", () => {
    expect(shareOf(25, 100)).toBe(25);
    expect(shareOf(1, 3)).toBe(33);
    expect(shareOf(5, 0)).toBe(0);
  });
});
