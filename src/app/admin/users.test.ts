import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "bun:test";
import { openTestDatabase, type TestDatabase } from "@test/d1";
import {
  createUser,
  type NewUserInput,
  resetPassword,
  setUserStatus,
} from "@/app/admin/users";
import { login } from "@/app/auth/login";
import { hashPassword } from "@/core/auth/password";
import { hashToken } from "@/core/auth/session";
import { ResourceErrorCode } from "@/core/error";
import type { User } from "@/core/users/user";
import { fetchByToken } from "@/infra/d1/actions/sessions";
import { save as saveUser } from "@/infra/d1/actions/users";

let d1: TestDatabase;
let admin: User;

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
  admin = saved.value;
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

describe("resetPassword", () => {
  it("replaces the password and drops every live session", async () => {
    const created = await createUser(d1.db, INPUT, NOW);
    if (created.isErr()) throw new Error(created.error.message);

    const signedIn = await login(d1.db, "vamshi", INPUT.temporaryPassword, NOW);
    if (signedIn.isErr()) throw new Error(signedIn.error.message);

    const reset = await resetPassword(
      d1.db,
      created.value.id,
      "pebble-second",
      NOW + 1000,
    );
    expect(reset.isOk()).toBe(true);

    const stale = await fetchByToken(
      d1.db,
      await hashToken(signedIn.value.token),
    );
    if (stale.isErr()) throw new Error(stale.error.message);
    expect(stale.value).toBeNull();

    expect(
      (
        await login(d1.db, "vamshi", INPUT.temporaryPassword, NOW + 2000)
      ).isErr(),
    ).toBe(true);
    expect(
      (await login(d1.db, "vamshi", "pebble-second", NOW + 2000)).isOk(),
    ).toBe(true);
  });
});

describe("setUserStatus", () => {
  it("signs a disabled account out everywhere", async () => {
    const created = await createUser(d1.db, INPUT, NOW);
    if (created.isErr()) throw new Error(created.error.message);

    const signedIn = await login(d1.db, "vamshi", INPUT.temporaryPassword, NOW);
    if (signedIn.isErr()) throw new Error(signedIn.error.message);

    const disabled = await setUserStatus(
      d1.db,
      admin,
      created.value.id,
      "disabled",
      NOW + 1000,
    );
    expect(disabled.isOk()).toBe(true);

    const stale = await fetchByToken(
      d1.db,
      await hashToken(signedIn.value.token),
    );
    if (stale.isErr()) throw new Error(stale.error.message);
    expect(stale.value).toBeNull();
  });
});
