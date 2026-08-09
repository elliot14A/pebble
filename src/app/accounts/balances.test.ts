import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "bun:test";
import { openTestDatabase, type TestDatabase } from "@test/d1";
import { balances } from "@/app/accounts/balances";
import { save as saveAccount } from "@/infra/d1/actions/accounts";
import { create as insert } from "@/infra/d1/actions/transactions";

let d1: TestDatabase;

const NOW = Date.UTC(2026, 7, 8, 12, 0, 0);

beforeAll(async () => {
  d1 = await openTestDatabase();
});

afterAll(async () => {
  await d1.dispose();
});

beforeEach(async () => {
  await d1.reset();
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

const spend = async (index: number) => {
  const result = await insert(d1.db, {
    id: `tx-${String(index).padStart(5, "0")}`,
    userId: "u1",
    walletId: null,
    accountId: "acc-inr",
    counterAccountId: null,
    categoryId: null,
    merchantId: null,
    type: "expense",
    amountMinor: 100,
    currency: "INR",
    baseAmountMinor: 100,
    fxRateE8: null,
    fxPending: false,
    occurredOn: "2026-08-08",
    note: "Chai",
    tags: null,
    clientId: `c-${index}`,
    createdAt: NOW + index,
    updatedAt: NOW + index,
    deletedAt: null,
  });
  if (result.isErr()) throw new Error(result.error.message);
};

describe("balances", () => {
  it("counts every transaction, not just the most recent page of them", async () => {
    const count = 250;
    for (let index = 0; index < count; index += 1) await spend(index);

    const result = (
      await balances(d1.db, "u1", "INR", "2026-08-08")
    )._unsafeUnwrap();

    expect(result[0]?.balanceMinor).toBe(-100 * count);
  });
});
