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
import { hashPassword } from "@/core/auth/password";
import { hashToken } from "@/core/auth/session";
import { ResourceErrorCode, ValidationErrorCode } from "@/core/error";
import { fetchByToken } from "@/infra/d1/actions/sessions";
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
  it("hands back a token that resolves to the user", async () => {
    await seed();

    const result = await login(d1.db, "akshith", PASSWORD, NOW);
    expect(result.isOk()).toBe(true);
    if (result.isErr()) return;

    const session = await fetchByToken(
      d1.db,
      await hashToken(result.value.token),
    );
    expect(session.isOk()).toBe(true);
    if (session.isErr()) return;
    expect(session.value?.user.username).toBe("akshith");
  });

  it("accepts the username in any case, with stray spaces", async () => {
    await seed();

    const result = await login(d1.db, "  AkShItH ", PASSWORD, NOW);
    expect(result.isOk()).toBe(true);
  });

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

  it("keeps the lock to itself unless the password is right", async () => {
    await seed();

    for (let attempt = 0; attempt < 8; attempt += 1) {
      await login(d1.db, "akshith", "wrong", NOW);
    }

    const guess = await login(d1.db, "akshith", "still-wrong", NOW);
    expect(guess.isErr()).toBe(true);
    if (!guess.isErr()) return;
    expect(guess.error.code).toBe(ValidationErrorCode.INVALID_INPUT);
    expect(guess.error.message).toBe(
      "That username and password do not match.",
    );
  });

  it("gives a typo a clean slate once the lock has aged out", async () => {
    await seed();

    for (let attempt = 0; attempt < 8; attempt += 1) {
      await login(d1.db, "akshith", "wrong", NOW);
    }

    const later = NOW + 16 * 60 * 1000;
    await login(d1.db, "akshith", "one-typo", later);

    const stillOpen = await login(d1.db, "akshith", PASSWORD, later);
    expect(stillOpen.isOk()).toBe(true);
  });

  it("lets them back in once the lock has aged out", async () => {
    await seed();

    for (let attempt = 0; attempt < 8; attempt += 1) {
      await login(d1.db, "akshith", "wrong", NOW);
    }

    const later = await login(d1.db, "akshith", PASSWORD, NOW + 16 * 60 * 1000);
    expect(later.isOk()).toBe(true);
  });

  it("forgets the failed tries after a good sign-in", async () => {
    await seed();

    await login(d1.db, "akshith", "wrong", NOW);
    await login(d1.db, "akshith", "wrong", NOW);
    expect((await login(d1.db, "akshith", PASSWORD, NOW)).isOk()).toBe(true);

    for (let attempt = 0; attempt < 7; attempt += 1) {
      await login(d1.db, "akshith", "wrong", NOW);
    }

    const stillOpen = await login(d1.db, "akshith", PASSWORD, NOW);
    expect(stillOpen.isOk()).toBe(true);
  });

  it("turns a disabled account away", async () => {
    await seed();
    await setStatus(d1.db, "u-1", "disabled");

    const result = await login(d1.db, "akshith", PASSWORD, NOW);
    expect(result.isErr()).toBe(true);
    if (!result.isErr()) return;
    expect(result.error.code).toBe(ResourceErrorCode.FORBIDDEN);
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

    await time("akshith");
    const real = Math.min(await time("akshith"), await time("akshith"));
    const missing = Math.min(await time("ghost"), await time("ghost"));

    expect(missing).toBeGreaterThan(real * 0.4);
  });

  it("refuses an account with no password set", async () => {
    await seed({ passwordHash: null });

    const result = await login(d1.db, "akshith", PASSWORD, NOW);
    expect(result.isErr()).toBe(true);
  });

  it("gives every sign-in its own token", async () => {
    await seed();

    const first = await login(d1.db, "akshith", PASSWORD, NOW);
    const second = await login(d1.db, "akshith", PASSWORD, NOW + 1000);
    if (first.isErr() || second.isErr()) throw new Error("expected sign-ins");

    expect(first.value.token).not.toBe(second.value.token);
  });
});
