import { describe, expect, it } from "bun:test";
import { normalizeMerchant } from "@/core/merchants/merchant";

describe("normalizeMerchant", () => {
  it("collapses the same shop typed differently into one key", () => {
    expect(normalizeMerchant("Swiggy")).toBe(normalizeMerchant("  swiggy "));
    expect(normalizeMerchant("Swiggy")).not.toBe(normalizeMerchant("Zomato"));
  });
});
