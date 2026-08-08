import { describe, expect, it } from "bun:test";
import { hashToken, isExpired, newSessionToken } from "@/core/auth/session";

const NOW = Date.UTC(2026, 7, 9, 12, 0, 0);

describe("newSessionToken", () => {
  it("never repeats", () => {
    const tokens = new Set(
      Array.from({ length: 500 }, () => newSessionToken()),
    );
    expect(tokens.size).toBe(500);
  });
});

describe("hashToken", () => {
  it("does not leak the token it came from", async () => {
    const token = newSessionToken();
    const hashed = await hashToken(token);

    expect(hashed).not.toContain(token);
    expect(hashed).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("expiry", () => {
  it("is expired on the boundary, not a moment after", () => {
    expect(isExpired(NOW, NOW)).toBe(true);
    expect(isExpired(NOW + 1, NOW)).toBe(false);
    expect(isExpired(NOW - 1, NOW)).toBe(true);
  });
});
