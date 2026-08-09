import { describe, expect, it } from "bun:test";
import { needle, pack, parse, unpack } from "@/core/tags";

describe("parse", () => {
  it("normalises, dedupes and caps what it takes", () => {
    expect(parse("Trip, japan  TRIP #work")).toEqual(["trip", "japan", "work"]);
    expect(parse("a b c d e f g h").length).toBe(6);
    expect(parse("   ")).toEqual([]);
  });
});

describe("pack", () => {
  it("wraps in commas so one tag cannot match another that starts with it", () => {
    expect(pack(["trip"])).toBe(",trip,");
    expect(unpack(pack(["trip", "japan"]))).toEqual(["trip", "japan"]);
    expect(needle("trip")).toBe("%,trip,%");
    expect(pack([])).toBeNull();
  });
});
