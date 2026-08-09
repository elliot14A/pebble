import { describe, expect, it } from "bun:test";
import { type Goal, perMonthMinor, usedBps } from "@/core/goals/goal";

const goal = (over: Partial<Goal> = {}): Goal => ({
  id: "g-1",
  userId: "u-1",
  name: "Japan",
  targetMinor: 20_000_000,
  savedMinor: 0,
  currency: "INR",
  accountId: null,
  targetOn: null,
  createdAt: 0,
  reachedAt: null,
  archivedAt: null,
  ...over,
});

describe("usedBps", () => {
  it("stops at a hundred percent however far past the target it goes", () => {
    expect(usedBps(goal({ savedMinor: 5_000_000 }))).toBe(2500);
    expect(usedBps(goal({ savedMinor: 30_000_000 }))).toBe(10_000);
    expect(usedBps(goal({ targetMinor: 0 }))).toBe(0);
  });
});

describe("perMonthMinor", () => {
  it("spreads what is left across the months remaining", () => {
    const saving = goal({ savedMinor: 5_000_000, targetOn: "2026-11-07" });
    expect(perMonthMinor(saving, "2026-08-09")).toBe(5_000_000);
  });

  it("asks for nothing more once it is reached", () => {
    const done = goal({ savedMinor: 20_000_000, targetOn: "2026-11-07" });
    expect(perMonthMinor(done, "2026-08-09")).toBeNull();
  });
});
