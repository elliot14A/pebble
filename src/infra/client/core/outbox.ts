export type Queued = Readonly<{
  clientId: string;
  fields: ReadonlyArray<readonly [string, string]>;
  at: number;
}>;

export const LIMIT = 50;

export const add = (
  queue: ReadonlyArray<Queued>,
  entry: Queued,
): ReadonlyArray<Queued> => {
  const without = queue.filter((held) => held.clientId !== entry.clientId);
  return [...without, entry].slice(-LIMIT);
};

export const drop = (
  queue: ReadonlyArray<Queued>,
  clientId: string,
): ReadonlyArray<Queued> => queue.filter((held) => held.clientId !== clientId);

export const read = (raw: string | null): ReadonlyArray<Queued> => {
  if (raw === null || raw === "") return [];

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(
      (entry): entry is Queued =>
        typeof entry === "object" &&
        entry !== null &&
        typeof (entry as Queued).clientId === "string" &&
        Array.isArray((entry as Queued).fields),
    );
  } catch {
    return [];
  }
};

export const write = (queue: ReadonlyArray<Queued>): string =>
  JSON.stringify(queue);

export const bodyOf = (entry: Queued): FormData => {
  const body = new FormData();
  for (const [name, value] of entry.fields) body.append(name, value);
  return body;
};
