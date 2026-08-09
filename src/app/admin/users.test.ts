import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "bun:test";
import { openTestDatabase, type TestDatabase } from "@test/d1";
import { createUser, type NewUserInput } from "@/app/admin/users";
import { login } from "@/app/auth";
import { hashPassword } from "@/core/auth";
import { ResourceErrorCode } from "@/core/error";
import { save as saveUser } from "@/infra/d1/actions/users";

let d1: TestDatabase;

const NOW = Date.UTC(2026, 7, 8, 12, 0, 0);

const INPUT: NewUserInput = {
  username: "vamshi",
  displayName: "Vamshi",
  role: "user",
  temporaryPassword: "pebble-start",
  baseCurrency: "INR",
};

beforeAll(async () => {
  d1 = await openTestDatabase();
});

afterAll(async () => {
  await d1.dispose();
});

beforeEach(async () => {
  await d1.reset();
  const saved = await saveUser(d1.db, {
    id: "u-admin",
    username: "akshith",
    displayName: "Akshith",
    role: "super_admin",
    baseCurrency: "INR",
    passwordHash: await hashPassword("pebble-admin"),
    status: "active",
    mustChangePassword: false,
    failedAttempts: 0,
    lockedUntil: null,
    createdAt: NOW,
  });
  if (saved.isErr()) throw new Error(saved.error.message);
});

describe("createUser", () => {
  it("makes an account that can sign in and must pick a new password", async () => {
    const created = await createUser(d1.db, INPUT, NOW);
    expect(created.isOk()).toBe(true);
    if (created.isErr()) return;
    expect(created.value.mustChangePassword).toBe(true);

    const signedIn = await login(d1.db, "vamshi", INPUT.temporaryPassword, NOW);
    expect(signedIn.isOk()).toBe(true);
  });

  it("refuses a username that is already taken", async () => {
    await createUser(d1.db, INPUT, NOW);

    const again = await createUser(d1.db, INPUT, NOW + 1000);
    expect(again.isErr()).toBe(true);
    if (!again.isErr()) return;
    expect(again.error.code).toBe(ResourceErrorCode.CONFLICT);
  });
});
