import { describe, expect, it } from "bun:test";
import { csv } from "@/core/exports/csv";

describe("csv", () => {
  it("quotes anything a spreadsheet would otherwise split on", () => {
    const made = csv(
      ["name", "note"],
      [
        ["Big Bazaar, Jubilee", 'He said "cheap"'],
        ["Two\nlines", "plain"],
      ],
    );

    expect(made.split("\r\n")).toEqual([
      "name,note",
      '"Big Bazaar, Jubilee","He said ""cheap"""',
      '"Two\nlines",plain',
    ]);
  });
});
