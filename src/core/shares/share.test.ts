import { describe, expect, it } from "bun:test";
import { windowFor } from "@/core/shares";

describe("windowFor", () => {
  it("runs a week Monday to Sunday", () => {
    for (const today of ["2026-08-03", "2026-08-06", "2026-08-09"]) {
      const result = windowFor("week", today);
      if (result.isErr()) throw new Error("expected a window");
      expect(result.value).toEqual({
        fromDate: "2026-08-03",
        toDate: "2026-08-09",
      });
    }
  });

  it("covers the whole month, including a leap February", () => {
    const august = windowFor("month", "2026-08-09");
    if (august.isErr()) throw new Error("expected a window");
    expect(august.value).toEqual({
      fromDate: "2026-08-01",
      toDate: "2026-08-31",
    });

    const february = windowFor("month", "2028-02-15");
    if (february.isErr()) throw new Error("expected a window");
    expect(february.value).toEqual({
      fromDate: "2028-02-01",
      toDate: "2028-02-29",
    });

    const november = windowFor("month", "2026-11-02");
    if (november.isErr()) throw new Error("expected a window");
    expect(november.value.toDate).toBe("2026-11-30");
  });
});
