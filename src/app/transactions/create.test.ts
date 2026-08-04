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
  type CreateOptions,
  create,
  type NewTransactionInput,
} from "@/app/transactions/create";
import { ResourceErrorCode, ValidationErrorCode } from "@/core/error";
import { save as saveAccount } from "@/infra/d1/actions/accounts";
import { save as saveRate } from "@/infra/d1/actions/rates";
import { list } from "@/infra/d1/actions/transactions";

let d1: TestDatabase;

const OPTIONS: CreateOptions = {
  baseCurrency: "INR",
  now: Date.UTC(2026, 7, 8, 12, 0, 0),
  today: "2026-08-08",
};

const account = (id: string, name: string, currency: string) => ({
  id,
  userId: "u1",
  name,
  kind: "bank" as const,
  currency,
  openingBalanceMinor: 0,
  sortOrder: 0,
  archivedAt: null,
});

const input = (
  over: Partial<NewTransactionInput> = {},
): NewTransactionInput => ({
  userId: "u1",
  accountId: "acc-inr",
  categoryId: "cat-food",
  type: "expense",
  amountText: "486",
  note: "Swiggy",
  clientId: "c1",
  ...over,
});

beforeAll(async () => {
  d1 = await openTestDatabase();
});

afterAll(async () => {
  await d1.dispose();
});

beforeEach(async () => {
  await d1.reset();
  await saveAccount(d1.db, account("acc-inr", "HDFC Savings", "INR"));
  await saveAccount(d1.db, account("acc-cash", "Cash", "INR"));
  await saveAccount(d1.db, account("acc-eur", "Revolut", "EUR"));
});

describe("create", () => {
  it("parses the keypad text against the account's currency", async () => {
    const saved = (await create(d1.db, input(), OPTIONS))._unsafeUnwrap();

    expect(saved.amountMinor).toBe(48600);
    expect(saved.currency).toBe("INR");
  });

  it("defaults the date to today, so the fast path needs no date tap", async () => {
    const saved = (await create(d1.db, input(), OPTIONS))._unsafeUnwrap();
    expect(saved.occurredOn).toBe("2026-08-08");
  });

  it("saves without a category, because only the amount is required", async () => {
    const saved = (
      await create(d1.db, input({ categoryId: null }), OPTIONS)
    )._unsafeUnwrap();
    expect(saved.categoryId).toBeNull();
  });

  it("needs no rate when the account is already in the base currency", async () => {
    const saved = (await create(d1.db, input(), OPTIONS))._unsafeUnwrap();

    expect(saved.baseAmountMinor).toBe(48600);
    expect(saved.fxRateE8).toBeNull();
    expect(saved.fxPending).toBe(false);
  });

  it("freezes the rate onto a foreign transaction", async () => {
    await saveRate(
      d1.db,
      "u1",
      { currency: "EUR", rateE8: 9_145_000_000, effectiveFrom: "2026-08-01" },
      OPTIONS.now,
    );

    const saved = (
      await create(
        d1.db,
        input({ accountId: "acc-eur", amountText: "8.40" }),
        OPTIONS,
      )
    )._unsafeUnwrap();

    expect(saved.currency).toBe("EUR");
    expect(saved.amountMinor).toBe(840);
    expect(saved.baseAmountMinor).toBe(76818);
    expect(saved.fxRateE8).toBe(9_145_000_000);
    expect(saved.fxPending).toBe(false);
  });

  it("uses the rate in force on the day, not the newest one", async () => {
    await saveRate(
      d1.db,
      "u1",
      { currency: "EUR", rateE8: 9_000_000_000, effectiveFrom: "2026-08-01" },
      OPTIONS.now,
    );
    await saveRate(
      d1.db,
      "u1",
      { currency: "EUR", rateE8: 9_500_000_000, effectiveFrom: "2026-08-20" },
      OPTIONS.now,
    );

    const saved = (
      await create(
        d1.db,
        input({
          accountId: "acc-eur",
          amountText: "10",
          occurredOn: "2026-08-05",
        }),
        OPTIONS,
      )
    )._unsafeUnwrap();

    expect(saved.fxRateE8).toBe(9_000_000_000);
  });

  it("saves anyway when no rate exists, flagging the row instead of blocking", async () => {
    const saved = (
      await create(
        d1.db,
        input({ accountId: "acc-eur", amountText: "21" }),
        OPTIONS,
      )
    )._unsafeUnwrap();

    expect(saved.fxPending).toBe(true);
    expect(saved.baseAmountMinor).toBeNull();
    expect(saved.amountMinor).toBe(2100);
  });

  it("never borrows another user's rate", async () => {
    await saveRate(
      d1.db,
      "someone-else",
      { currency: "EUR", rateE8: 9_145_000_000, effectiveFrom: "2026-08-01" },
      OPTIONS.now,
    );

    const saved = (
      await create(
        d1.db,
        input({ accountId: "acc-eur", amountText: "8.40" }),
        OPTIONS,
      )
    )._unsafeUnwrap();

    expect(saved.fxPending).toBe(true);
  });

  it("moves a transfer between two accounts of the same currency", async () => {
    const saved = (
      await create(
        d1.db,
        input({
          type: "transfer",
          counterAccountId: "acc-cash",
          categoryId: null,
          note: null,
          amountText: "5000",
        }),
        OPTIONS,
      )
    )._unsafeUnwrap();

    expect(saved.counterAccountId).toBe("acc-cash");
    expect(saved.baseAmountMinor).toBe(500000);
  });

  it("refuses a transfer across currencies rather than mangling it", async () => {
    const failed = await create(
      d1.db,
      input({
        type: "transfer",
        counterAccountId: "acc-eur",
        categoryId: null,
        note: null,
        amountText: "5000",
      }),
      OPTIONS,
    );

    expect(failed._unsafeUnwrapErr().code).toBe(
      ValidationErrorCode.INVALID_INPUT,
    );
  });

  it("refuses an account that belongs to somebody else", async () => {
    const failed = await create(d1.db, input({ userId: "intruder" }), OPTIONS);
    expect(failed._unsafeUnwrapErr().code).toBe(ResourceErrorCode.NOT_FOUND);
  });

  it("rejects an unreadable amount instead of coercing it", async () => {
    const failed = await create(d1.db, input({ amountText: "4.8.6" }), OPTIONS);
    expect(failed.isErr()).toBe(true);
  });

  it("is idempotent, so replaying a queued offline save adds nothing", async () => {
    const first = (await create(d1.db, input(), OPTIONS))._unsafeUnwrap();
    const second = (await create(d1.db, input(), OPTIONS))._unsafeUnwrap();

    expect(second.id).toBe(first.id);
    expect((await list(d1.db, { userId: "u1" }))._unsafeUnwrap()).toHaveLength(
      1,
    );
  });
});
