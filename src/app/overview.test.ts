import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "bun:test";
import { openTestDatabase, type TestDatabase } from "@test/d1";
import { overview } from "@/app/overview";
import type { Transaction } from "@/core/transactions/transaction";
import { save as saveAccount } from "@/infra/d1/actions/accounts";
import { create as insert } from "@/infra/d1/actions/transactions";

let d1: TestDatabase;
let counter = 0;

const TODAY = "2026-08-10";

beforeAll(async () => {
  d1 = await openTestDatabase();
});

afterAll(async () => {
  await d1.dispose();
});

beforeEach(async () => {
  await d1.reset();
  counter = 0;
  await saveAccount(d1.db, {
    id: "acc-inr",
    userId: "u1",
    name: "HDFC Savings",
    kind: "bank",
    currency: "INR",
    openingBalanceMinor: 0,
    sortOrder: 0,
    archivedAt: null,
  });
});

const add = async (over: Partial<Transaction>) => {
  counter += 1;
  const result = await insert(d1.db, {
    id: `tx-${String(counter).padStart(4, "0")}`,
    userId: "u1",
    walletId: null,
    accountId: "acc-inr",
    counterAccountId: null,
    categoryId: null,
    merchantId: null,
    type: "expense",
    amountMinor: 0,
    currency: "INR",
    baseAmountMinor: 0,
    fxRateE8: null,
    fxPending: false,
    occurredOn: TODAY,
    note: "Thing",
    clientId: `c${counter}`,
    createdAt: counter,
    updatedAt: counter,
    deletedAt: null,
    ...over,
  });
  if (result.isErr()) throw new Error(result.error.message);
};

const read = async () =>
  (await overview(d1.db, "u1", "INR", TODAY))._unsafeUnwrap();

describe("overview", () => {
  it("saves what is left over, and reports the rate in basis points", async () => {
    await add({
      type: "income",
      amountMinor: 1000000,
      baseAmountMinor: 1000000,
    });
    await add({
      type: "expense",
      amountMinor: 250000,
      baseAmountMinor: 250000,
    });

    const summary = await read();
    expect(summary.savedMinor).toBe(750000);
    expect(summary.savingsRateBps).toBe(7500);
  });

  it("nets a refund off spending so it matches the category totals", async () => {
    await add({
      type: "expense",
      amountMinor: 620000,
      baseAmountMinor: 620000,
    });
    await add({ type: "refund", amountMinor: 90000, baseAmountMinor: 90000 });

    const summary = await read();
    expect(summary.inMinor).toBe(0);
    expect(summary.outMinor).toBe(530000);
    expect(summary.savedMinor).toBe(-530000);
  });

  it("flags rows still waiting on a rate instead of counting them as zero spend", async () => {
    await add({
      type: "expense",
      amountMinor: 2100,
      currency: "EUR",
      baseAmountMinor: null,
      fxPending: true,
    });

    const summary = await read();
    expect(summary.fxPendingCount).toBe(1);
    expect(summary.outMinor).toBe(0);
  });
});
