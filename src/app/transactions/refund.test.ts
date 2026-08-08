import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "bun:test";
import { openTestDatabase, type TestDatabase } from "@test/d1";
import { create as addTransaction } from "@/app/transactions/create";
import { refund } from "@/app/transactions/refund";
import { flowMinor } from "@/core/transactions/balance";
import { save as saveAccount } from "@/infra/d1/actions/accounts";
import { save as saveRate } from "@/infra/d1/actions/rates";
import { list } from "@/infra/d1/actions/transactions";

let d1: TestDatabase;

const NOW = Date.UTC(2026, 7, 16, 12, 0, 0);
const TODAY = "2026-08-16";
const USER = "u-1";

const spend = async (amountText: string, currency = "INR") => {
  const made = await addTransaction(
    d1.db,
    {
      userId: USER,
      type: "expense",
      amountText,
      accountId: currency === "INR" ? "acc-1" : "acc-2",
      note: "Headphones",
      occurredOn: "2026-08-10",
      clientId: `c-${amountText}-${currency}`,
    },
    { baseCurrency: "INR", now: NOW, today: TODAY },
  );
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

  for (const [id, currency] of [
    ["acc-1", "INR"],
    ["acc-2", "USD"],
  ]) {
    const saved = await saveAccount(d1.db, {
      id: id ?? "",
      userId: USER,
      name: id ?? "",
      kind: "bank",
      currency: currency ?? "INR",
      openingBalanceMinor: 0,
      sortOrder: 0,
      archivedAt: null,
    });
    if (saved.isErr()) throw new Error(saved.error.message);
  }

  const rate = await saveRate(
    d1.db,
    USER,
    { currency: "USD", rateE8: 8_000_000_000, effectiveFrom: "2026-01-01" },
    NOW,
  );
  if (rate.isErr()) throw new Error(rate.error.message);
});

describe("refund", () => {
  it("reduces what was spent rather than counting as income", async () => {
    const spent = await spend("2000");
    await refund(d1.db, {
      userId: USER,
      id: spent.id,
      amountText: "500",
      today: TODAY,
      now: NOW,
    });

    const all = await list(d1.db, { userId: USER });
    if (all.isErr()) throw new Error(all.error.message);

    const flow = flowMinor(all.value);
    expect(flow.outMinor).toBe(150_000);
    expect(flow.inMinor).toBe(0);
  });

  it("scales the base amount with a partial refund", async () => {
    const spent = await spend("100", "USD");
    expect(spent.baseAmountMinor).toBe(800_000);

    const back = await refund(d1.db, {
      userId: USER,
      id: spent.id,
      amountText: "25",
      today: TODAY,
      now: NOW,
    });
    if (back.isErr()) throw new Error(back.error.message);

    expect(back.value.currency).toBe("USD");
    expect(back.value.baseAmountMinor).toBe(200_000);
  });

  it("refuses more than was spent", async () => {
    const spent = await spend("2000");

    const back = await refund(d1.db, {
      userId: USER,
      id: spent.id,
      amountText: "2500",
      today: TODAY,
      now: NOW,
    });
    expect(back.isErr()).toBe(true);
  });

  it("will not refund someone else's spending", async () => {
    const spent = await spend("2000");

    const back = await refund(d1.db, {
      userId: "u-2",
      id: spent.id,
      amountText: "100",
      today: TODAY,
      now: NOW,
    });
    expect(back.isErr()).toBe(true);
  });
});
