import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "bun:test";
import { openTestDatabase, type TestDatabase } from "@test/d1";
import { board, visible } from "@/app/categories/list";
import { remove } from "@/app/categories/remove";
import { save } from "@/app/categories/save";
import { create as addTransaction } from "@/app/transactions";
import { ResourceErrorCode } from "@/core/error";
import { save as saveAccount } from "@/infra/d1/actions/accounts";
import { save as saveCategory } from "@/infra/d1/actions/categories";

let d1: TestDatabase;

const NOW = Date.UTC(2026, 7, 16, 12, 0, 0);
const USER = "u-1";

const mine = (name: string) =>
  save(d1.db, {
    userId: USER,
    id: null,
    name,
    kind: "expense",
    glyph: "food",
    tint: "money",
    now: NOW,
  });

beforeAll(async () => {
  d1 = await openTestDatabase();
});

afterAll(async () => {
  await d1.dispose();
});

beforeEach(async () => {
  await d1.reset();

  const shared = await saveCategory(d1.db, {
    id: "cat-shared",
    ownerId: null,
    name: "Food",
    slug: "food",
    kind: "expense",
    glyph: "food",
    tint: "money",
    parentId: null,
    sortOrder: 1,
    archivedAt: null,
  });
  if (shared.isErr()) throw new Error(shared.error.message);

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

describe("save", () => {
  it("refuses a name that is already taken, whatever the case", async () => {
    await mine("Chai");
    const again = await mine("  chai  ");

    expect(again.isErr()).toBe(true);
    if (!again.isErr()) return;
    expect(again.error.code).toBe(ResourceErrorCode.CONFLICT);
  });

  it("will not rename a shared built-in", async () => {
    const renamed = await save(d1.db, {
      userId: USER,
      id: "cat-shared",
      name: "Grub",
      kind: "expense",
      glyph: "food",
      tint: "money",
      now: NOW,
    });

    expect(renamed.isErr()).toBe(true);
    if (!renamed.isErr()) return;
    expect(renamed.error.code).toBe(ResourceErrorCode.FORBIDDEN);
  });
});

describe("remove", () => {
  it("hides rather than deletes one that history depends on", async () => {
    const made = await mine("Chai");
    if (made.isErr()) throw new Error(made.error.message);

    const spent = await addTransaction(
      d1.db,
      {
        userId: USER,
        type: "expense",
        amountText: "120",
        accountId: "acc-1",
        categoryId: made.value.id,
        note: "Cutting chai",
        occurredOn: "2026-08-10",
        clientId: "c-1",
      },
      { baseCurrency: "INR", now: NOW, today: "2026-08-16" },
    );
    if (spent.isErr()) throw new Error(spent.error.message);

    const gone = await remove(d1.db, USER, made.value.id, NOW);
    if (gone.isErr()) throw new Error(gone.error.message);
    expect(gone.value).toBe("hidden");

    const seen = await visible(d1.db, USER);
    if (seen.isErr()) throw new Error(seen.error.message);
    expect(seen.value.map((c) => c.id)).not.toContain(made.value.id);
  });

  it("hides a shared built-in for one person only", async () => {
    const gone = await remove(d1.db, USER, "cat-shared", NOW);
    if (gone.isErr()) throw new Error(gone.error.message);
    expect(gone.value).toBe("hidden");

    const theirs = await visible(d1.db, "u-2");
    if (theirs.isErr()) throw new Error(theirs.error.message);
    expect(theirs.value.map((c) => c.id)).toContain("cat-shared");

    const shelf = await board(d1.db, USER);
    if (shelf.isErr()) throw new Error(shelf.error.message);
    expect(shelf.value.hidden.map((l) => l.category.id)).toContain(
      "cat-shared",
    );
  });
});
