import { describe, expect, it } from "bun:test";
import {
  cleanLabel,
  expiryFor,
  formatRange,
  isLive,
  isSpan,
  newShareToken,
  type Share,
  windowFor,
} from "@/core/shares/share";

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

describe("newShareToken", () => {
  it("is url safe and never repeats", () => {
    const tokens = new Set(Array.from({ length: 200 }, () => newShareToken()));

    expect(tokens.size).toBe(200);
    for (const token of tokens) {
      expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
      expect(token.length).toBeGreaterThanOrEqual(32);
    }
  });
});

describe("windowFor", () => {
  it("gives a day the same start and end", () => {
    const result = windowFor("day", "2026-08-09");
    expect(result.isOk()).toBe(true);
    if (result.isErr()) return;
    expect(result.value).toEqual({
      fromDate: "2026-08-09",
      toDate: "2026-08-09",
    });
  });

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

  it("takes a custom range as given", () => {
    const result = windowFor("range", "2026-08-09", "2026-07-01", "2026-07-15");
    if (result.isErr()) throw new Error("expected a window");
    expect(result.value).toEqual({
      fromDate: "2026-07-01",
      toDate: "2026-07-15",
    });
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

  it("refuses a range longer than a year and a bit", () => {
    expect(
      windowFor("range", "2026-08-09", "2020-01-01", "2026-01-01").isErr(),
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

  it("never expires when no expiry was set", () => {
    expect(isLive(share(), NOW + 10 ** 12)).toBe(true);
  });
});

describe("expiryFor", () => {
  it("treats zero and below as no expiry", () => {
    expect(expiryFor(0, NOW)).toBeNull();
    expect(expiryFor(-3, NOW)).toBeNull();
  });

  it("counts forward in whole days", () => {
    expect(expiryFor(7, NOW)).toBe(NOW + 7 * 24 * 60 * 60 * 1000);
  });
});

describe("cleanLabel", () => {
  it("collapses whitespace", () => {
    const result = cleanLabel("  August   for   Amma ");
    if (result.isErr()) throw new Error("expected a label");
    expect(result.value).toBe("August for Amma");
  });

  it("refuses an overlong label", () => {
    expect(cleanLabel("x".repeat(61)).isErr()).toBe(true);
  });
});

describe("formatRange", () => {
  it("shows a single day once", () => {
    expect(formatRange("2026-08-09", "2026-08-09")).toBe("9 Aug 2026");
  });

  it("does not repeat the month within one month", () => {
    expect(formatRange("2026-08-01", "2026-08-31")).toBe("1 – 31 Aug 2026");
  });

  it("keeps both months within one year", () => {
    expect(formatRange("2026-07-28", "2026-08-03")).toBe("28 Jul – 3 Aug 2026");
  });

  it("spells out both years across a boundary", () => {
    expect(formatRange("2025-12-30", "2026-01-02")).toBe(
      "30 Dec 2025 – 2 Jan 2026",
    );
  });
});

describe("isSpan", () => {
  it("only accepts the four spans", () => {
    expect(isSpan("day")).toBe(true);
    expect(isSpan("range")).toBe(true);
    expect(isSpan("fortnight")).toBe(false);
  });
});
