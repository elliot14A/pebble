import { describe, expect, it } from "bun:test";
import { fingerprint, read } from "@/core/statements";

const HDFC = `Statement of account
Account No: XXXXXX1234

Date,Narration,Chq./Ref.No.,Withdrawal Amt.,Deposit Amt.,Closing Balance
02/08/26,UPI-SWIGGY-1234,000000,"1,234.50",,"45,000.00"
03/08/26,SALARY AUG,000000,,"85,000.00","1,30,000.00"
04/08/26,ATM WDL,000000,500.00,,"1,29,500.00"
,Opening balance,,,,
`;

describe("read", () => {
  it("reads day-first dates and comma grouped amounts", () => {
    const [first, second] = read(HDFC).lines;

    expect(first).toEqual({
      occurredOn: "2026-08-02",
      description: "UPI-SWIGGY-1234",
      amountText: "1234.5",
      direction: "out",
      category: "",
    });
    expect(second?.direction).toBe("in");
    expect(second?.amountText).toBe("85000");
  });

  it("takes a single signed amount column when there is no debit and credit pair", () => {
    const found = read(
      `Transaction Date,Description,Amount\n2026-08-02,Netflix,-499.00\n2026-08-03,Refund,199.00\n`,
    );

    expect(found.lines.map((line) => line.direction)).toEqual(["out", "in"]);
    expect(found.lines[0]?.amountText).toBe("499");
  });

  it("gives up rather than guessing when there is no date column", () => {
    expect(read("a,b,c\n1,2,3\n").lines).toEqual([]);
  });
});

describe("the format pebble asks for", () => {
  it("takes a signed amount and a category name", () => {
    const found = read(
      `date,description,amount,category
2026-08-01,Swiggy dinner,-1240.00,Food
2026-08-02,Salary August,85000.00,Salary
2026-08-03,Auto to work,-60,
`,
    );

    expect(found.lines).toEqual([
      {
        occurredOn: "2026-08-01",
        description: "Swiggy dinner",
        amountText: "1240",
        direction: "out",
        category: "Food",
      },
      {
        occurredOn: "2026-08-02",
        description: "Salary August",
        amountText: "85000",
        direction: "in",
        category: "Salary",
      },
      {
        occurredOn: "2026-08-03",
        description: "Auto to work",
        amountText: "60",
        direction: "out",
        category: "",
      },
    ]);
  });
});

describe("fingerprint", () => {
  it("is the same for a row imported twice and different across accounts", () => {
    const line = read(HDFC).lines[0];
    if (line === undefined) throw new Error("expected a line");

    expect(fingerprint("acc-1", line)).toBe(fingerprint("acc-1", line));
    expect(fingerprint("acc-1", line)).not.toBe(fingerprint("acc-2", line));
  });
});
