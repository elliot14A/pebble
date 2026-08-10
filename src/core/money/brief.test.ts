import { describe, expect, it } from "bun:test";
import { briefAmount } from "@/core/money";

describe("briefAmount", () => {
  it("counts rupees in thousands, lakhs and crores", () => {
    expect(briefAmount(58_000, "INR")).toBe("580");
    expect(briefAmount(597_300, "INR")).toBe("6k");
    expect(briefAmount(250_000_00, "INR")).toBe("2.5L");
    expect(briefAmount(5_00_00_000_00, "INR")).toBe("5Cr");
  });

  it("counts dollars in thousands and millions instead", () => {
    expect(briefAmount(250_000_00, "USD")).toBe("250k");
    expect(briefAmount(5_000_000_00, "USD")).toBe("5M");
  });

  it("keeps the sign and rounds small amounts to whole units", () => {
    expect(briefAmount(-58_000, "INR")).toBe("-580");
    expect(briefAmount(149, "INR")).toBe("1");
    expect(briefAmount(0, "INR")).toBe("0");
  });
});
