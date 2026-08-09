export const MAX_TAGS = 6;
export const MAX_LENGTH = 20;

export const clean = (raw: string): string =>
  raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_LENGTH);

export const parse = (raw: string): ReadonlyArray<string> => {
  const seen: string[] = [];

  for (const piece of raw.split(/[,\s]+/)) {
    const tag = clean(piece);
    if (tag === "" || seen.includes(tag)) continue;
    seen.push(tag);
    if (seen.length === MAX_TAGS) break;
  }

  return seen;
};

/**
 * Stored wrapped in commas so a LIKE for ",trip," cannot match ",trip-japan,".
 */
export const pack = (tags: ReadonlyArray<string>): string | null =>
  tags.length === 0 ? null : `,${tags.join(",")},`;

export const unpack = (packed: string | null): ReadonlyArray<string> =>
  packed === null ? [] : packed.split(",").filter((tag) => tag !== "");

export const needle = (tag: string): string => `%,${clean(tag)},%`;
