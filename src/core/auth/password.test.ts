import { describe, expect, it } from "bun:test";
import {
  checkPassword,
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

  it("rejects the wrong password", async () => {
    const stored = await hashPassword("correct horse battery");
    expect(await verifyPassword("Correct horse battery", stored)).toBe(false);
    expect(await verifyPassword("", stored)).toBe(false);
  });

  it("never produces the same hash twice, even for one password", async () => {
    const first = await hashPassword("same password");
    const second = await hashPassword("same password");

    expect(first).not.toBe(second);
    expect(await verifyPassword("same password", first)).toBe(true);
    expect(await verifyPassword("same password", second)).toBe(true);
  });

  it("carries its own parameters so they can be changed later", async () => {
    const stored = await hashPassword("whatever");
    const [algorithm, digest, iterations] = stored.split("$");

    expect(algorithm).toBe("pbkdf2");
    expect(digest).toBe("sha256");
    expect(Number(iterations)).toBe(MAX_ITERATIONS);
  });
});

describe("verifyPassword", () => {
  it("says no to a user who has never been given a password", async () => {
    expect(await verifyPassword("anything", null)).toBe(false);
  });

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
  it("leaves a current hash alone", async () => {
    expect(needsRehash(await hashPassword("x"))).toBe(false);
  });

  it("flags a weaker or unknown hash", () => {
    expect(needsRehash(null)).toBe(true);
    expect(needsRehash("pbkdf2$sha256$1000$c2FsdA==$aGFzaA==")).toBe(true);
    expect(needsRehash("bcrypt$sha256$210000$c2FsdA==$aGFzaA==")).toBe(true);
  });
});

describe("checkPassword", () => {
  it("insists on some length", () => {
    expect(checkPassword("short").isErr()).toBe(true);
    expect(checkPassword("longenough").isOk()).toBe(true);
  });

  it("refuses whitespace pretending to be a password", () => {
    expect(checkPassword("          ").isErr()).toBe(true);
  });
});
