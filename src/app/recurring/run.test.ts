import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "bun:test";
import { openTestDatabase, type TestDatabase } from "@test/d1";
import { runDue } from "@/app/recurring/run";
import { pay, save } from "@/app/recurring/save";
import type { Recurring } from "@/core/recurring";
import { save as saveAccount } from "@/infra/d1/actions/accounts";
import { fetch as fetchRule } from "@/infra/d1/actions/recurring";
import { list } from "@/infra/d1/actions/transactions";

let d1: TestDatabase;

const NOW = Date.UTC(2026, 7, 9, 12, 0, 0);
const USER = "u-1";

const rule = async (over: Partial<Recurring> = {}) => {
  const made = await save(d1.db, {
    userId: USER,
    id: null,
    kind: over.kind ?? "transaction",
    type: "expense",
    name: over.name ?? "Netflix",
    amountText: "499",
    accountId: "acc-1",
    categoryId: null,
    every: over.every ?? "month",
    startOn: over.nextOn ?? "2026-08-05",
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

  const account = await saveAccount(d1.db, {
    id: "acc-1",
    userId: USER,
    name: "Savings",
    kind: "bank",
    currency: "INR",
    openingBalanceMinor: 0,
    sortOrder: 0,
    archivedAt: null,
  });
  if (account.isErr()) throw new Error(account.error.message);
});

describe("runDue", () => {
  it("logs every run that was missed, each on its own date", async () => {
    const made = await rule({ nextOn: "2026-06-05" });

    const report = await runDue(d1.db, "INR", "2026-08-09", NOW);
    if (report.isErr()) throw new Error(report.error.message);
    expect(report.value.logged).toBe(3);

    const rows = await list(d1.db, { userId: USER });
    if (rows.isErr()) throw new Error(rows.error.message);
    expect(rows.value.map((r) => r.occurredOn).sort()).toEqual([
      "2026-06-05",
      "2026-07-05",
      "2026-08-05",
    ]);

    const after = await fetchRule(d1.db, USER, made.id);
    if (after.isErr()) throw new Error(after.error.message);
    expect(after.value?.nextOn).toBe("2026-09-05");
  });

  it("writes nothing twice when the schedule fires again", async () => {
    await rule({ nextOn: "2026-08-05" });

    await runDue(d1.db, "INR", "2026-08-09", NOW);
    await runDue(d1.db, "INR", "2026-08-09", NOW);

    const rows = await list(d1.db, { userId: USER });
    if (rows.isErr()) throw new Error(rows.error.message);
    expect(rows.value.length).toBe(1);
  });

  it("leaves a bill standing rather than logging it", async () => {
    const bill = await rule({ kind: "bill", nextOn: "2026-08-05" });

    const report = await runDue(d1.db, "INR", "2026-08-09", NOW);
    if (report.isErr()) throw new Error(report.error.message);
    expect(report.value.billsWaiting).toBe(1);
    expect(report.value.logged).toBe(0);

    const rows = await list(d1.db, { userId: USER });
    if (rows.isErr()) throw new Error(rows.error.message);
    expect(rows.value.length).toBe(0);

    const after = await fetchRule(d1.db, USER, bill.id);
    if (after.isErr()) throw new Error(after.error.message);
    expect(after.value?.nextOn).toBe("2026-08-05");
  });

  it("logs a bill on its due date only once it is marked paid", async () => {
    const bill = await rule({ kind: "bill", nextOn: "2026-08-05" });

    const paid = await pay(d1.db, USER, bill.id, "INR", NOW);
    expect(paid.isOk()).toBe(true);

    const rows = await list(d1.db, { userId: USER });
    if (rows.isErr()) throw new Error(rows.error.message);
    expect(rows.value.length).toBe(1);
    expect(rows.value[0]?.occurredOn).toBe("2026-08-05");

    const after = await fetchRule(d1.db, USER, bill.id);
    if (after.isErr()) throw new Error(after.error.message);
    expect(after.value?.nextOn).toBe("2026-09-05");
  });
});
