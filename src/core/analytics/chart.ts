export type Arc = Readonly<{
  length: number;
  gap: number;
  offset: number;
}>;

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

export const barHeight = (
  value: number,
  max: number,
  available: number,
): number => {
  if (max <= 0 || value <= 0) return 0;
  return Math.max(3, Math.round((value / max) * available));
};

export const maxOf = (values: ReadonlyArray<number>): number =>
  values.reduce((highest, value) => (value > highest ? value : highest), 0);

export const shareOf = (value: number, total: number): number =>
  total <= 0 ? 0 : Math.round((value / total) * 100);
