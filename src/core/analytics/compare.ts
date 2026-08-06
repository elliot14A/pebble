import type { Bucket } from "@/core/analytics/summary";

export type Change = Readonly<{
  key: string;
  nowMinor: number;
  thenMinor: number;
  deltaMinor: number;
  /**
   * Basis points, so no float. Null when there is nothing to compare against:
   * going from zero to something is not a percentage, it is new.
   */
  deltaBps: number | null;
}>;

export const changeBps = (now: number, then: number): number | null =>
  then === 0 ? null : Math.round(((now - then) / then) * 10_000);

export const change = (key: string, now: number, then: number): Change => ({
  key,
  nowMinor: now,
  thenMinor: then,
  deltaMinor: now - then,
  deltaBps: changeBps(now, then),
});

/**
 * Every key from either side, biggest mover first. A category that stopped
 * entirely matters as much as one that started, so both are kept.
 */
export const compareBuckets = (
  now: ReadonlyArray<Bucket>,
  then: ReadonlyArray<Bucket>,
): ReadonlyArray<Change> => {
  const nowBy = new Map(now.map((bucket) => [bucket.key, bucket.minor]));
  const thenBy = new Map(then.map((bucket) => [bucket.key, bucket.minor]));
  const keys = new Set([...nowBy.keys(), ...thenBy.keys()]);

  return [...keys]
    .map((key) => change(key, nowBy.get(key) ?? 0, thenBy.get(key) ?? 0))
    .filter((entry) => entry.deltaMinor !== 0)
    .sort((a, b) => Math.abs(b.deltaMinor) - Math.abs(a.deltaMinor));
};
