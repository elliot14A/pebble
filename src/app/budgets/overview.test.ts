import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "bun:test";
import { openTestDatabase, type TestDatabase } from "@test/d1";
import { overview } from "@/app/budgets/overview";
import { set } from "@/app/budgets/set";
import { create as addTransaction } from "@/app/transactions/create";
import { save as saveAccount } from "@/infra/d1/actions/accounts";
import { save as saveCategory } from "@/infra/d1/actions/categories";

let d1: TestDatabase;

const NOW = Date.UTC(2026, 7, 16, 12, 0, 0);
const TODAY = "2026-08-16";
const MONTH = "2026-08";
const USER = "u-1";

const spend = async (amount: string, categoryId: string | null, on: string) => {
  const made = await addTransaction(
    d1.db,
    {
      userId: USER,
      type: "expense",
      amountText: amount,
      accountId: "acc-1",
      categoryId,
      note: "Something",
      occurredOn: on,
      clientId: `${amount}-${on}-${categoryId ?? "none"}`,
    },
    { baseCurrency: "INR", now: NOW, today: TODAY },
  );
  if (made.isErr()) throw new Error(made.error.message);
};

const budget = async (categoryId: string | null, amountText: string) => {
  const made = await set(d1.db, {
    userId: USER,
    categoryId,
    amountText,
    currency: "INR",
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

  for (const [id, name] of [
    ["cat-food", "Food"],
    ["cat-fuel", "Fuel"],
  ]) {
    const saved = await saveCategory(d1.db, {
      id: id ?? "",
      ownerId: USER,
      name: name ?? "",
      slug: id ?? "",
      kind: "expense",
      glyph: "food",
      tint: "money",
      parentId: null,
      sortOrder: 0,
      archivedAt: null,
    });
    if (saved.isErr()) throw new Error(saved.error.message);
  }
});

describe("overview", () => {
  it("counts only this month against the limit", async () => {
    await budget(null, "20000");
    await spend("5000", "cat-food", "2026-08-02");
    await spend("9999", "cat-food", "2026-07-31");
    await spend("9999", "cat-food", "2026-09-01");

    const data = await overview(d1.db, USER, MONTH, TODAY);
    if (data.isErr()) throw new Error(data.error.message);

    expect(data.value.overall?.progress.spentMinor).toBe(500_000);
    expect(data.value.overall?.progress.leftMinor).toBe(1_500_000);
  });

  it("holds each category to its own limit", async () => {
    await budget("cat-food", "6000");
    await budget("cat-fuel", "4000");
    await spend("5000", "cat-food", "2026-08-02");
    await spend("1000", "cat-fuel", "2026-08-03");

    const data = await overview(d1.db, USER, MONTH, TODAY);
    if (data.isErr()) throw new Error(data.error.message);

    const food = data.value.lines.find(
      (line) => line.budget.categoryId === "cat-food",
    );
    const fuel = data.value.lines.find(
      (line) => line.budget.categoryId === "cat-fuel",
    );

    expect(food?.progress.spentMinor).toBe(500_000);
    expect(fuel?.progress.spentMinor).toBe(100_000);
    expect(food?.progress.state).toBe("close");
    expect(fuel?.progress.state).toBe("ok");
  });

  it("puts the category closest to trouble first", async () => {
    await budget("cat-fuel", "10000");
    await budget("cat-food", "1000");
    await spend("900", "cat-food", "2026-08-02");
    await spend("100", "cat-fuel", "2026-08-02");

    const data = await overview(d1.db, USER, MONTH, TODAY);
    if (data.isErr()) throw new Error(data.error.message);

    expect(data.value.lines[0]?.budget.categoryId).toBe("cat-food");
  });

  it("lets a refund give the budget back", async () => {
    await budget("cat-food", "6000");
    await spend("5000", "cat-food", "2026-08-02");

    const refund = await addTransaction(
      d1.db,
      {
        userId: USER,
        type: "refund",
        amountText: "2000",
        accountId: "acc-1",
        categoryId: "cat-food",
        note: "Returned",
        occurredOn: "2026-08-05",
        clientId: "refund-1",
      },
      { baseCurrency: "INR", now: NOW, today: TODAY },
    );
    if (refund.isErr()) throw new Error(refund.error.message);

    const data = await overview(d1.db, USER, MONTH, TODAY);
    if (data.isErr()) throw new Error(data.error.message);

    const food = data.value.lines.find(
      (line) => line.budget.categoryId === "cat-food",
    );
    expect(food?.progress.spentMinor).toBe(300_000);
  });

  it("replaces the limit rather than stacking a second one", async () => {
    const first = await budget("cat-food", "6000");
    const second = await budget("cat-food", "9000");

    expect(second.id).toBe(first.id);

    const data = await overview(d1.db, USER, MONTH, TODAY);
    if (data.isErr()) throw new Error(data.error.message);

    expect(data.value.lines.length).toBe(1);
    expect(data.value.lines[0]?.progress.limitMinor).toBe(900_000);
  });

  it("refuses a limit of nothing", async () => {
    const zero = await set(d1.db, {
      userId: USER,
      categoryId: null,
      amountText: "0",
      currency: "INR",
      now: NOW,
    });
    expect(zero.isErr()).toBe(true);
  });

  it("projects the month from the run rate so far", async () => {
    await budget(null, "20000");
    await spend("8000", "cat-food", "2026-08-02");

    const data = await overview(d1.db, USER, MONTH, TODAY);
    if (data.isErr()) throw new Error(data.error.message);

    expect(data.value.overall?.projectedMinor).toBe(1_550_000);
    expect(data.value.overall?.onPace).toBe(true);
  });
});
