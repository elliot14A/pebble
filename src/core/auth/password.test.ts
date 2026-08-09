import { describe, expect, it } from "bun:test";
import {
  hashPassword,
  MAX_ITERATIONS,
  needsRehash,
  verifyPassword,
} from "@/core/auth/password";

describe("hashPassword", () => {
  it("stays inside the iteration count Workers will run", async () => {
    const rounds = Number((await hashPassword("anything")).split("$")[2]);

    expect(rounds).toBeLessThanOrEqual(100_000);
    expect(MAX_ITERATIONS).toBe(100_000);
  });

  it("accepts the password it just hashed", async () => {
    const stored = await hashPassword("correct horse battery");
    expect(await verifyPassword("correct horse battery", stored)).toBe(true);
  });
});

describe("verifyPassword", () => {
  it("says no to a mangled hash rather than throwing", async () => {
    for (const stored of [
      "",
      "nonsense",
      "pbkdf2$sha256$210000$onlyfour",
      "bcrypt$sha256$210000$c2FsdA==$aGFzaA==",
      "pbkdf2$sha512$210000$c2FsdA==$aGFzaA==",
      "pbkdf2$sha256$abc$c2FsdA==$aGFzaA==",
      "pbkdf2$sha256$-1$c2FsdA==$aGFzaA==",
      "pbkdf2$sha256$210000$!!!$!!!",
    ]) {
      expect(await verifyPassword("anything", stored)).toBe(false);
    }
  });
});

describe("needsRehash", () => {
  it("flags a weaker or unknown hash", () => {
    expect(needsRehash(null)).toBe(true);
    expect(needsRehash("pbkdf2$sha256$1000$c2FsdA==$aGFzaA==")).toBe(true);
    expect(needsRehash("bcrypt$sha256$210000$c2FsdA==$aGFzaA==")).toBe(true);
  });
});
