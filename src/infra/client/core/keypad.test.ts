import { describe, expect, it } from "bun:test";
import {
  display,
  empty,
  press,
  withDecimals,
} from "@/infra/client/core/keypad";

const type = (keys: string, decimals = 2) =>
  [...keys].reduce((keypad, key) => press(keypad, key), empty(decimals));

describe("keypad", () => {
  it("allows one decimal point and no more", () => {
    expect(display(type("8.40"))).toBe("8.40");
    expect(display(type("8.4.0"))).toBe("8.40");
  });

  it("stops at the currency's number of decimals", () => {
    expect(display(type("8.401"))).toBe("8.40");
  });

  it("truncates when the account switches to a coarser currency", () => {
    expect(display(withDecimals(type("8.40"), 0))).toBe("8");
    expect(display(withDecimals(type("8.40"), 2))).toBe("8.40");
  });
});
