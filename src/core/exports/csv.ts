const NEEDS_QUOTES = /[",\r\n]/;

const cell = (value: string): string =>
  NEEDS_QUOTES.test(value) ? `"${value.replaceAll('"', '""')}"` : value;

export const row = (cells: ReadonlyArray<string>): string =>
  cells.map(cell).join(",");

export const csv = (
  header: ReadonlyArray<string>,
  rows: ReadonlyArray<ReadonlyArray<string>>,
): string => [row(header), ...rows.map(row)].join("\r\n");

export const fileNameFor = (
  from: string,
  to: string,
  extension: string,
): string =>
  from === to
    ? `pebble-${from}.${extension}`
    : `pebble-${from}-to-${to}.${extension}`;
