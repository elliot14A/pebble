import { describe, expect, it } from "bun:test";
import { fitWithin } from "@/infra/client/core/image";

describe("fitWithin", () => {
  it("leaves a photo that already fits alone", () => {
    expect(fitWithin(1200, 900, 1600)).toEqual({ width: 1200, height: 900 });
  });

  it("scales the long edge down and keeps the shape", () => {
    expect(fitWithin(4000, 3000, 1600)).toEqual({ width: 1600, height: 1200 });
    expect(fitWithin(3000, 4000, 1600)).toEqual({ width: 1200, height: 1600 });
  });

  it("never rounds an edge away to nothing", () => {
    expect(fitWithin(10_000, 3, 1600).height).toBe(1);
    expect(fitWithin(0, 0, 1600)).toEqual({ width: 0, height: 0 });
  });
});
