import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "bun:test";
import { openTestDatabase, type TestDatabase } from "@test/d1";
import { login } from "@/app/auth/login";
import { hashPassword } from "@/core/auth";
import { ResourceErrorCode, ValidationErrorCode } from "@/core/error";
import { save as saveUser } from "@/infra/d1/actions/users";
import { setStatus } from "@/infra/d1/actions/users/security";

let d1: TestDatabase;

const NOW = Date.UTC(2026, 7, 8, 12, 0, 0);
const PASSWORD = "pebble-start";

const seed = async (over: Record<string, unknown> = {}) => {
  const saved = await saveUser(d1.db, {
    id: "u-1",
    username: "akshith",
    displayName: "Akshith",
    role: "super_admin",
    baseCurrency: "INR",
    passwordHash: await hashPassword(PASSWORD),
    status: "active",
    mustChangePassword: false,
    failedAttempts: 0,
    lockedUntil: null,
    createdAt: NOW,
    ...over,
  });
  if (saved.isErr()) throw new Error(saved.error.message);
  return saved.value;
};

beforeAll(async () => {
  d1 = await openTestDatabase();
});

afterAll(async () => {
  await d1.dispose();
});

beforeEach(async () => {
  await d1.reset();
});

describe("login", () => {
  it("refuses a wrong password and an unknown user identically", async () => {
    await seed();

    const wrong = await login(d1.db, "akshith", "not-the-password", NOW);
    const missing = await login(d1.db, "nobody", PASSWORD, NOW);

    expect(wrong.isErr()).toBe(true);
    expect(missing.isErr()).toBe(true);
    if (!wrong.isErr() || !missing.isErr()) return;
    expect(missing.error.message).toBe(wrong.error.message);
    expect(wrong.error.code).toBe(ValidationErrorCode.INVALID_INPUT);
  });

  it("locks the account after eight wrong tries, even with the right one", async () => {
    await seed();

    for (let attempt = 0; attempt < 8; attempt += 1) {
      await login(d1.db, "akshith", "wrong", NOW);
    }

    const locked = await login(d1.db, "akshith", PASSWORD, NOW);
    expect(locked.isErr()).toBe(true);
    if (!locked.isErr()) return;
    expect(locked.error.code).toBe(ResourceErrorCode.FORBIDDEN);
  });

  it("does not admit a disabled account exists until the password is right", async () => {
    await seed();
    await setStatus(d1.db, "u-1", "disabled");

    const result = await login(d1.db, "akshith", "not-the-password", NOW);
    expect(result.isErr()).toBe(true);
    if (!result.isErr()) return;
    expect(result.error.code).toBe(ValidationErrorCode.INVALID_INPUT);
  });

  it("spends as long on a username that does not exist", async () => {
    await seed();

    const time = async (username: string): Promise<number> => {
      const started = performance.now();
      await login(d1.db, username, "not-the-password", NOW);
      return performance.now() - started;
    };

    const fastest = async (username: string): Promise<number> => {
      let best = Number.POSITIVE_INFINITY;
      for (let round = 0; round < 4; round += 1) {
        best = Math.min(best, await time(username));
      }
      return best;
    };

    await time("akshith");
    const real = await fastest("akshith");
    const missing = await fastest("ghost");

    expect(missing).toBeGreaterThan(real * 0.25);
  });
});
