import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "bun:test";
import { openTestDatabase, type TestDatabase } from "@test/d1";
import { detach } from "@/app/receipts/detach";
import { scan } from "@/app/receipts/scan";
import { MAX_BYTES } from "@/core/receipts/receipt";
import { fetch as fetchReceipt } from "@/infra/d1/actions/receipts";
import {
  makeRead,
  type Reader,
  type ReadReceipt,
} from "@/infra/openai/receipt";

let d1: TestDatabase;

const NOW = Date.UTC(2026, 7, 16, 12, 0, 0);
const TODAY = "2026-08-16";
const USER = "u-1";

const photo = (bytes = 32): ArrayBuffer => new Uint8Array(bytes).buffer;

const replying = (content: string): ReadReceipt =>
  makeRead(
    {
      chat: {
        completions: {
          create: async () => ({ choices: [{ message: { content } }] }),
        },
      },
    } as unknown as Reader,
    "a-model",
    {},
  );

const failing = (): ReadReceipt =>
  makeRead(
    {
      chat: {
        completions: {
          create: async () => {
            throw new Error("the model is having a day");
          },
        },
      },
    } as unknown as Reader,
    "a-model",
    {},
  );

beforeAll(async () => {
  d1 = await openTestDatabase();
});

afterAll(async () => {
  await d1.dispose();
});

beforeEach(async () => {
  await d1.reset();
});

describe("scan", () => {
  it("stores the photo and keeps what it read", async () => {
    const scanned = await scan(
      d1.db,
      d1.bucket,
      replying(
        '{"total":"₹1,234.50","merchant":"Big Bazaar","date":"14/08/2026","currency":"INR"}',
      ),
      {
        userId: USER,
        bytes: photo(),
        contentType: "image/jpeg",
        today: TODAY,
        now: NOW,
      },
    );
    if (scanned.isErr()) throw new Error(scanned.error.message);

    expect(scanned.value.reading).toEqual({
      amountText: "1234.50",
      merchant: "Big Bazaar",
      occurredOn: "2026-08-14",
      currency: "INR",
    });

    const stored = await d1.bucket.get(scanned.value.receipt.objectKey);
    expect(stored).not.toBeNull();

    const row = await fetchReceipt(d1.db, USER, scanned.value.receipt.id);
    if (row.isErr()) throw new Error(row.error.message);
    expect(row.value?.readAmountText).toBe("1234.50");
    expect(row.value?.transactionId).toBeNull();
  });

  it("keeps the photo even when the model cannot read it", async () => {
    const scanned = await scan(d1.db, d1.bucket, failing(), {
      userId: USER,
      bytes: photo(),
      contentType: "image/jpeg",
      today: TODAY,
      now: NOW,
    });
    if (scanned.isErr()) throw new Error(scanned.error.message);

    expect(scanned.value.reading.amountText).toBeNull();
    expect(scanned.value.receipt.readAt).toBeNull();
    expect(await d1.bucket.get(scanned.value.receipt.objectKey)).not.toBeNull();
  });

  it("refuses anything that is not a photo", async () => {
    const scanned = await scan(d1.db, d1.bucket, replying("{}"), {
      userId: USER,
      bytes: photo(),
      contentType: "application/pdf",
      today: TODAY,
      now: NOW,
    });
    expect(scanned.isErr()).toBe(true);
  });

  it("refuses an empty or oversized photo", async () => {
    const empty = await scan(d1.db, d1.bucket, replying("{}"), {
      userId: USER,
      bytes: photo(0),
      contentType: "image/png",
      today: TODAY,
      now: NOW,
    });
    expect(empty.isErr()).toBe(true);

    const huge = await scan(d1.db, d1.bucket, replying("{}"), {
      userId: USER,
      bytes: photo(MAX_BYTES + 1),
      contentType: "image/png",
      today: TODAY,
      now: NOW,
    });
    expect(huge.isErr()).toBe(true);
  });

  it("keeps one person's receipt away from another", async () => {
    const scanned = await scan(d1.db, d1.bucket, replying("{}"), {
      userId: USER,
      bytes: photo(),
      contentType: "image/jpeg",
      today: TODAY,
      now: NOW,
    });
    if (scanned.isErr()) throw new Error(scanned.error.message);

    const theirs = await fetchReceipt(d1.db, "u-2", scanned.value.receipt.id);
    if (theirs.isErr()) throw new Error(theirs.error.message);
    expect(theirs.value).toBeNull();
  });
});

describe("detach", () => {
  it("takes the photo out of the bucket, not just the row", async () => {
    const scanned = await scan(d1.db, d1.bucket, replying("{}"), {
      userId: USER,
      bytes: photo(),
      contentType: "image/jpeg",
      today: TODAY,
      now: NOW,
    });
    if (scanned.isErr()) throw new Error(scanned.error.message);
    const { id, objectKey } = scanned.value.receipt;

    const gone = await detach(d1.db, d1.bucket, USER, id);
    expect(gone.isOk()).toBe(true);

    expect(await d1.bucket.get(objectKey)).toBeNull();
    const row = await fetchReceipt(d1.db, USER, id);
    if (row.isErr()) throw new Error(row.error.message);
    expect(row.value).toBeNull();
  });

  it("will not let one person delete another's receipt", async () => {
    const scanned = await scan(d1.db, d1.bucket, replying("{}"), {
      userId: USER,
      bytes: photo(),
      contentType: "image/jpeg",
      today: TODAY,
      now: NOW,
    });
    if (scanned.isErr()) throw new Error(scanned.error.message);

    const theirs = await detach(
      d1.db,
      d1.bucket,
      "u-2",
      scanned.value.receipt.id,
    );
    expect(theirs.isErr()).toBe(true);
    expect(await d1.bucket.get(scanned.value.receipt.objectKey)).not.toBeNull();
  });
});
