import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "bun:test";
import { openTestDatabase, type TestDatabase } from "@test/d1";
import { create } from "@/app/shares/create";
import { view } from "@/app/shares/view";
import { create as addTransaction } from "@/app/transactions/create";
import { hashPassword } from "@/core/auth/password";
import { save as saveAccount } from "@/infra/d1/actions/accounts";
import { revoke } from "@/infra/d1/actions/shares";
import { save as saveUser } from "@/infra/d1/actions/users";
import { setStatus } from "@/infra/d1/actions/users/security";

let d1: TestDatabase;

const NOW = Date.UTC(2026, 7, 9, 12, 0, 0);
const TODAY = "2026-08-09";

const person = async (id: string, username: string) => {
  const saved = await saveUser(d1.db, {
    id,
    username,
    displayName: username,
    role: "user",
    baseCurrency: "INR",
    passwordHash: await hashPassword("pebble-start"),
    status: "active",
    mustChangePassword: false,
    failedAttempts: 0,
    lockedUntil: null,
    createdAt: NOW,
  });
  if (saved.isErr()) throw new Error(saved.error.message);

  const account = await saveAccount(d1.db, {
    id: `acc-${id}`,
    userId: id,
    name: "Savings",
    kind: "bank",
    currency: "INR",
    openingBalanceMinor: 0,
    sortOrder: 0,
    archivedAt: null,
  });
  if (account.isErr()) throw new Error(account.error.message);
};

const spend = async (
  userId: string,
  amount: string,
  name: string,
  on: string,
) => {
  const made = await addTransaction(
    d1.db,
    {
      userId,
      type: "expense",
      amountText: amount,
      accountId: `acc-${userId}`,
      note: name,
      occurredOn: on,
      clientId: `${userId}-${name}-${on}`,
    },
    { baseCurrency: "INR", now: NOW, today: TODAY },
  );
  if (made.isErr()) throw new Error(made.error.message);
};

const shareFor = async (userId: string, from: string, to: string) => {
  const made = await create(d1.db, {
    userId,
    span: "range",
    from,
    to,
    label: "",
    expiresInDays: 30,
    today: TODAY,
    now: NOW,
  });
  if (made.isErr()) throw new Error(made.error.message);
  return made.value;
};

beforeAll(async () => {
  d1 = await openTestDatabase();
});

afterAll(async () => {
  await d1.dispose();
});

beforeEach(async () => {
  await d1.reset();
  await person("u-1", "akshith");
  await person("u-2", "vamshi");
});

describe("view", () => {
  it("shows only what falls inside the window", async () => {
    await spend("u-1", "100", "Inside", "2026-08-05");
    await spend("u-1", "200", "Also inside", "2026-08-09");
    await spend("u-1", "999", "Before", "2026-07-31");
    await spend("u-1", "888", "After", "2026-08-10");

    const share = await shareFor("u-1", "2026-08-01", "2026-08-09");
    const shown = await view(d1.db, share.token, NOW);
    if (shown.isErr()) throw new Error(shown.error.message);

    expect(shown.value.transactionCount).toBe(2);
    expect(shown.value.outMinor).toBe(30_000);
    const names = shown.value.days.flatMap((day) =>
      day.transactions.map((tx) => tx.note),
    );
    expect(names).toContain("Inside");
    expect(names).not.toContain("Before");
    expect(names).not.toContain("After");
  });

  it("never leaks another person's spending", async () => {
    await spend("u-1", "100", "Mine", "2026-08-05");
    await spend("u-2", "500", "Not yours", "2026-08-05");

    const share = await shareFor("u-1", "2026-08-01", "2026-08-09");
    const shown = await view(d1.db, share.token, NOW);
    if (shown.isErr()) throw new Error(shown.error.message);

    expect(shown.value.transactionCount).toBe(1);
    expect(shown.value.outMinor).toBe(10_000);
    const names = shown.value.days.flatMap((day) =>
      day.transactions.map((tx) => tx.note),
    );
    expect(names).toEqual(["Mine"]);
  });

  it("refuses an unknown token", async () => {
    expect((await view(d1.db, "no-such-token", NOW)).isErr()).toBe(true);
  });

  it("refuses a revoked link", async () => {
    const share = await shareFor("u-1", "2026-08-01", "2026-08-09");
    expect((await view(d1.db, share.token, NOW)).isOk()).toBe(true);

    await revoke(d1.db, "u-1", share.id, NOW);
    expect((await view(d1.db, share.token, NOW)).isErr()).toBe(true);
  });

  it("will not let one person revoke another's link", async () => {
    const share = await shareFor("u-1", "2026-08-01", "2026-08-09");

    await revoke(d1.db, "u-2", share.id, NOW);

    expect((await view(d1.db, share.token, NOW)).isOk()).toBe(true);
  });

  it("refuses an expired link", async () => {
    const share = await shareFor("u-1", "2026-08-01", "2026-08-09");
    const later = NOW + 31 * 24 * 60 * 60 * 1000;

    expect((await view(d1.db, share.token, later)).isErr()).toBe(true);
  });

  it("goes dark when the owner is disabled", async () => {
    const share = await shareFor("u-1", "2026-08-01", "2026-08-09");
    await setStatus(d1.db, "u-1", "disabled");

    expect((await view(d1.db, share.token, NOW)).isErr()).toBe(true);
  });

  it("counts every view", async () => {
    const share = await shareFor("u-1", "2026-08-01", "2026-08-09");

    await view(d1.db, share.token, NOW);
    await view(d1.db, share.token, NOW + 1000);
    const third = await view(d1.db, share.token, NOW + 2000);
    if (third.isErr()) throw new Error(third.error.message);

    expect(third.value.share.viewCount).toBe(2);
  });

  it("keeps showing new entries added inside the window", async () => {
    const share = await shareFor("u-1", "2026-08-01", "2026-08-31");

    const before = await view(d1.db, share.token, NOW);
    if (before.isErr()) throw new Error(before.error.message);
    expect(before.value.transactionCount).toBe(0);

    await spend("u-1", "250", "Added later", "2026-08-15");

    const after = await view(d1.db, share.token, NOW);
    if (after.isErr()) throw new Error(after.error.message);
    expect(after.value.transactionCount).toBe(1);
  });
});
