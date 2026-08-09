import { describe, expect, it } from "bun:test";
import { changeBps } from "@/core/analytics";

describe("changeBps", () => {
  it("refuses to express growth from nothing as a percentage", () => {
    expect(changeBps(500, 0)).toBeNull();
  });
});
