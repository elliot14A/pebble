import { describe, expect, it } from "bun:test";
import { briefAmount } from "@/core/money";

describe("briefAmount", () => {
  it("counts rupees in thousands, lakhs and crores", () => {
    expect(briefAmount(58_000, "INR")).toBe("580");
    expect(briefAmount(597_300, "INR")).toBe("5.9k");
    expect(briefAmount(250_000_00, "INR")).toBe("2.5L");
    expect(briefAmount(5_00_00_000_00, "INR")).toBe("5Cr");
  });

  it("counts dollars in thousands and millions instead", () => {
    expect(briefAmount(250_000_00, "USD")).toBe("250k");
    expect(briefAmount(5_000_000_00, "USD")).toBe("5M");
  });

  it("never rounds up past the real figure", () => {
    expect(briefAmount(999_900, "INR")).toBe("9.9k");
    expect(briefAmount(199_000_00, "INR")).toBe("1.9L");
  });
});
