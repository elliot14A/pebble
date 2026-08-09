import { describe, expect, it } from "bun:test";
import { arcs } from "@/core/analytics/chart";

describe("arcs", () => {
  it("starts each arc where the last one ended", () => {
    expect(arcs([1, 1, 2], 100).map((arc) => arc.offset)).toEqual([
      -0, -25, -50,
    ]);
  });
});
