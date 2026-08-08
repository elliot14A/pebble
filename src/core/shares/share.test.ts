import { describe, expect, it } from "bun:test";
import { isLive, type Share, windowFor } from "@/core/shares/share";

const NOW = Date.UTC(2026, 7, 9, 12, 0, 0);

const share = (over: Partial<Share> = {}): Share => ({
  id: "s-1",
  userId: "u-1",
  token: "tok",
  label: "",
  span: "month",
  fromDate: "2026-08-01",
  toDate: "2026-08-31",
  createdAt: NOW,
  expiresAt: null,
  revokedAt: null,
  viewCount: 0,
  lastViewedAt: null,
  ...over,
});

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

  it("refuses a backwards or half-given range", () => {
    expect(
      windowFor("range", "2026-08-09", "2026-07-15", "2026-07-01").isErr(),
    ).toBe(true);
    expect(windowFor("range", "2026-08-09", "2026-07-15").isErr()).toBe(true);
    expect(
      windowFor("range", "2026-08-09", "nonsense", "2026-07-01").isErr(),
    ).toBe(true);
  });
});

describe("isLive", () => {
  it("is false once revoked, whatever the expiry", () => {
    expect(isLive(share({ revokedAt: NOW - 1 }), NOW)).toBe(false);
  });

  it("is false once expired", () => {
    expect(isLive(share({ expiresAt: NOW - 1 }), NOW)).toBe(false);
    expect(isLive(share({ expiresAt: NOW + 1 }), NOW)).toBe(true);
  });
});
