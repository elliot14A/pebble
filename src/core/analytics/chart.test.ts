import { describe, expect, it } from "bun:test";
import { arcs } from "@/core/analytics";

describe("arcs", () => {
  it("lays each slice end to end and fills exactly one circle", () => {
    const slices = arcs([50, 30, 20], 100);

    expect(slices.map((arc) => arc.length)).toEqual([50, 30, 20]);
    expect(slices.map((arc) => arc.offset)).toEqual([-0, -50, -80]);
    expect(slices.map((arc) => arc.gap)).toEqual([50, 70, 80]);
  });

  it("draws nothing rather than dividing by nothing", () => {
    expect(arcs([], 100)).toEqual([]);
    expect(arcs([0, 0], 100)).toEqual([]);
  });
});
