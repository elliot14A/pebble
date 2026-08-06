export type Arc = Readonly<{
  /** Stroke dash pattern: the drawn part, then the rest of the circle. */
  length: number;
  gap: number;
  offset: number;
}>;

/**
 * Turns values into stroke-dash arcs around one circle. Doing it here rather
 * than in the view keeps the sum-to-a-whole-circle property testable.
 */
export const arcs = (
  values: ReadonlyArray<number>,
  circumference: number,
): ReadonlyArray<Arc> => {
  const total = values.reduce((sum, value) => sum + value, 0);
  if (total <= 0) return [];

  let travelled = 0;
  return values.map((value) => {
    const length = (value / total) * circumference;
    const arc = {
      length,
      gap: circumference - length,
      offset: -travelled,
    };
    travelled += length;
    return arc;
  });
};

/** Bar height in pixels, guarding against a divide by zero on an empty chart. */
export const barHeight = (
  value: number,
  max: number,
  available: number,
): number => (max <= 0 ? 0 : Math.round((value / max) * available));

export const maxOf = (values: ReadonlyArray<number>): number =>
  values.reduce((highest, value) => (value > highest ? value : highest), 0);

/** Percent as a rounded whole number, for a legend that must not wobble. */
export const shareOf = (value: number, total: number): number =>
  total <= 0 ? 0 : Math.round((value / total) * 100);
