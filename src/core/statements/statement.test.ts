import { describe, expect, it } from "bun:test";
import { fingerprints, read } from "@/core/statements";

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
      `Transaction Date,Description,Amount\n2026-08-02,Netflix,-499.00\n2026-08-03,Refund,199.00\n2026-08-04,MMT/IMPS/608499287446/Payout,1.00\n`,
    );

    expect(found.lines.map((line) => line.direction)).toEqual([
      "out",
      "in",
      "in",
    ]);
    expect(found.lines[0]?.amountText).toBe("499");
    expect(found.lines[2]?.amountText).toBe("1");
  });

  it("gives up rather than guessing when there is no date column", () => {
    expect(read("a,b,c\n1,2,3\n").lines).toEqual([]);
  });

  it("keeps quoted delimiters, escaped quotes and wrapped lines whole", () => {
    const found = read(
      `date,description,amount\n2026-08-01,"Bakery, the good one",-120\n2026-08-02,"he said ""hi""",-40\n2026-08-03,"two\nlines",-60\n`,
    );

    expect(found.lines.map((line) => line.description)).toEqual([
      "Bakery, the good one",
      'he said "hi"',
      "two lines",
    ]);
    expect(found.skipped).toBe(0);

    const tabbed = read(
      "Date\tNarration\tAmount\n2026-08-01\tSwiggy\t-240\n2026-08-02\tSalary\t85000\n",
    );
    expect(tabbed.lines.map((line) => line.direction)).toEqual(["out", "in"]);
    expect(tabbed.lines[0]?.description).toBe("Swiggy");
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

describe("fingerprints", () => {
  it("repeats for the same file and separates rows a statement genuinely repeats", () => {
    const lines = read(HDFC).lines;

    expect(fingerprints("acc-1", lines)).toEqual(fingerprints("acc-1", lines));
    expect(fingerprints("acc-1", lines)[0]).not.toBe(
      fingerprints("acc-2", lines)[0],
    );

    const twice = read(
      `date,description,amount\n2026-08-02,Chai,-20\n2026-08-02,Chai,-20\n`,
    ).lines;
    const marks = fingerprints("acc-1", twice);
    expect(marks[0]).not.toBe(marks[1]);
    expect(marks[1]?.endsWith("#2")).toBe(true);
  });
});
