export const MAX_EDGE = 1600;

export const fitWithin = (
  width: number,
  height: number,
  max = MAX_EDGE,
): Readonly<{ width: number; height: number }> => {
  const longest = Math.max(width, height);
  if (longest <= max || longest === 0) return { width, height };

  const scale = max / longest;
  return {
    width: Math.max(Math.round(width * scale), 1),
    height: Math.max(Math.round(height * scale), 1),
  };
};

export const needsShrinking = (
  type: string,
  bytes: number,
  limit: number,
): boolean =>
  bytes > limit || !["image/jpeg", "image/png", "image/webp"].includes(type);
