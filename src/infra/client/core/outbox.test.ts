import { describe, expect, it } from "bun:test";
import { add, LIMIT, read } from "@/infra/client/core/outbox";

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
