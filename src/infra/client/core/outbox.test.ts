import { describe, expect, it } from "bun:test";
import { add, LIMIT, read, verdictOf } from "@/infra/client/core/outbox";

const entry = (clientId: string) => ({ clientId, fields: [], at: 0 });

describe("add", () => {
  it("replaces a retry of the same entry rather than queueing it twice", () => {
    const queue = add(add([], entry("c1")), entry("c1"));
    expect(queue.length).toBe(1);
  });

  it("drops the oldest once the queue is full", () => {
    let queue = add([], entry("first"));
    for (let index = 0; index < LIMIT + 5; index += 1) {
      queue = add(queue, entry(`c${index}`));
    }
    expect(queue.length).toBe(LIMIT);
    expect(queue.map((held) => held.clientId)).not.toContain("first");
  });
});

describe("read", () => {
  it("returns nothing rather than throwing on rubbish", () => {
    expect(read(null)).toEqual([]);
    expect(read("{oops")).toEqual([]);
    expect(read('{"not":"an array"}')).toEqual([]);
    expect(read('[{"nope":1}]')).toEqual([]);
  });
});

describe("verdictOf", () => {
  it("keeps the entry when the session lapsed rather than losing it", () => {
    expect(verdictOf(0, "opaqueredirect")).toBe("keep");
    expect(verdictOf(302)).toBe("keep");
    expect(verdictOf(401)).toBe("keep");
    expect(verdictOf(403)).toBe("keep");
  });

  it("treats a replay of something already saved as sent", () => {
    expect(verdictOf(204)).toBe("sent");
    expect(verdictOf(409)).toBe("sent");
  });

  it("stops retrying what will never be accepted, and retries a server fault", () => {
    expect(verdictOf(400)).toBe("give-up");
    expect(verdictOf(500)).toBe("keep");
  });
});
