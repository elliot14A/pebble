import { describe, expect, it } from "bun:test";
import {
  expiryFrom,
  hashToken,
  isExpired,
  newSessionToken,
  SESSION_DAYS,
  shouldExtend,
} from "@/core/auth/session";

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 7, 9, 12, 0, 0);

describe("newSessionToken", () => {
  it("is long and url safe", () => {
    const token = newSessionToken();
    expect(token.length).toBeGreaterThanOrEqual(43);
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("never repeats", () => {
    const tokens = new Set(
      Array.from({ length: 500 }, () => newSessionToken()),
    );
    expect(tokens.size).toBe(500);
  });
});

describe("hashToken", () => {
  it("is stable for one token and different for another", async () => {
    const token = newSessionToken();
    expect(await hashToken(token)).toBe(await hashToken(token));
    expect(await hashToken(token)).not.toBe(await hashToken(newSessionToken()));
  });

  it("does not leak the token it came from", async () => {
    const token = newSessionToken();
    const hashed = await hashToken(token);

    expect(hashed).not.toContain(token);
    expect(hashed).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("expiry", () => {
  it("lasts the advertised number of days", () => {
    expect(expiryFrom(NOW)).toBe(NOW + SESSION_DAYS * DAY);
  });

  it("is expired on the boundary, not a moment after", () => {
    expect(isExpired(NOW, NOW)).toBe(true);
    expect(isExpired(NOW + 1, NOW)).toBe(false);
    expect(isExpired(NOW - 1, NOW)).toBe(true);
  });
});

describe("shouldExtend", () => {
  it("waits a day before writing to the database again", () => {
    expect(shouldExtend(NOW, NOW)).toBe(false);
    expect(shouldExtend(NOW - DAY / 2, NOW)).toBe(false);
    expect(shouldExtend(NOW - DAY - 1, NOW)).toBe(true);
  });
});
