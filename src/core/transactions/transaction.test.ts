import { describe, expect, it } from "bun:test";
import { ValidationErrorCode } from "@/core/error";
import {
  type NewTransaction,
  validateNewTransaction,
} from "@/core/transactions/transaction";

const base: NewTransaction = {
  userId: "u1",
  walletId: null,
  accountId: "a1",
  counterAccountId: null,
  categoryId: "food",
  merchantId: null,
  type: "expense",
  amountMinor: 48600,
  currency: "INR",
  occurredOn: "2026-08-08",
  note: "Swiggy",
  clientId: "c1",
};

const errFor = (patch: Partial<NewTransaction>) =>
  validateNewTransaction({ ...base, ...patch })._unsafeUnwrapErr().code;

describe("validateNewTransaction", () => {
  it("refuses a zero or negative amount on everything but an adjustment", () => {
    expect(errFor({ amountMinor: 0 })).toBe(ValidationErrorCode.INVALID_INPUT);
    expect(errFor({ amountMinor: -1 })).toBe(ValidationErrorCode.INVALID_INPUT);
  });

  it("refuses a date that is not YYYY-MM-DD", () => {
    expect(errFor({ occurredOn: "08/08/2026" })).toBe(
      ValidationErrorCode.INVALID_INPUT,
    );
  });

  it("requires a transfer to name a different destination", () => {
    expect(errFor({ type: "transfer" })).toBe(
      ValidationErrorCode.INVALID_INPUT,
    );
    expect(errFor({ type: "transfer", counterAccountId: "a1" })).toBe(
      ValidationErrorCode.INVALID_INPUT,
    );
    expect(
      validateNewTransaction({
        ...base,
        type: "transfer",
        counterAccountId: "a2",
      }).isOk(),
    ).toBe(true);
  });

  it("requires a name, so a row never reads as just a category", () => {
    expect(errFor({ note: null })).toBe(ValidationErrorCode.INVALID_INPUT);
    expect(errFor({ note: "   " })).toBe(ValidationErrorCode.INVALID_INPUT);
  });

  it("requires a client id, because replay depends on it", () => {
    expect(errFor({ clientId: "" })).toBe(ValidationErrorCode.INVALID_INPUT);
  });
});
