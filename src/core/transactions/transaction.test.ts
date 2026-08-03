import { describe, expect, it } from "bun:test";
import { ValidationErrorCode } from "@/core/error";
import {
  isTransactionType,
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
  it("accepts an ordinary expense", () => {
    expect(validateNewTransaction(base).isOk()).toBe(true);
  });

  it("refuses a zero or negative amount on everything but an adjustment", () => {
    expect(errFor({ amountMinor: 0 })).toBe(ValidationErrorCode.INVALID_INPUT);
    expect(errFor({ amountMinor: -1 })).toBe(ValidationErrorCode.INVALID_INPUT);
  });

  it("lets an adjustment go either way but not nowhere", () => {
    expect(
      validateNewTransaction({
        ...base,
        type: "adjustment",
        amountMinor: -2500,
      }).isOk(),
    ).toBe(true);
    expect(errFor({ type: "adjustment", amountMinor: 0 })).toBe(
      ValidationErrorCode.INVALID_INPUT,
    );
  });

  it("refuses a fractional minor unit", () => {
    expect(errFor({ amountMinor: 486.5 })).toBe(
      ValidationErrorCode.INVALID_INPUT,
    );
  });

  it("refuses a currency it does not know", () => {
    expect(errFor({ currency: "XYZ" })).toBe(ValidationErrorCode.INVALID_INPUT);
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

  it("refuses a destination account on anything that is not a transfer", () => {
    expect(errFor({ counterAccountId: "a2" })).toBe(
      ValidationErrorCode.INVALID_INPUT,
    );
  });

  it("requires a name, so a row never reads as just a category", () => {
    expect(errFor({ note: null })).toBe(ValidationErrorCode.INVALID_INPUT);
    expect(errFor({ note: "   " })).toBe(ValidationErrorCode.INVALID_INPUT);
  });

  it("trims the name it stores", () => {
    expect(
      validateNewTransaction({ ...base, note: "  Swiggy  " })._unsafeUnwrap()
        .note,
    ).toBe("Swiggy");
  });

  it("does not ask a transfer to be named, both accounts already say it", () => {
    expect(
      validateNewTransaction({
        ...base,
        type: "transfer",
        counterAccountId: "a2",
        note: null,
      }).isOk(),
    ).toBe(true);
  });

  it("requires a client id, because replay depends on it", () => {
    expect(errFor({ clientId: "" })).toBe(ValidationErrorCode.INVALID_INPUT);
  });
});

describe("isTransactionType", () => {
  it("accepts every type the ledger folds over", () => {
    for (const type of [
      "expense",
      "income",
      "transfer",
      "refund",
      "adjustment",
    ]) {
      expect(isTransactionType(type)).toBe(true);
    }
  });

  it("rejects anything else", () => {
    expect(isTransactionType("withdrawal")).toBe(false);
  });
});
