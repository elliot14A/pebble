import { splitRows } from "@/core/statements/csv";

export type Line = Readonly<{
  occurredOn: string;
  description: string;
  amountText: string;
  direction: "in" | "out";
  category: string;
}>;

export type Reading = Readonly<{
  lines: ReadonlyArray<Line>;
  skipped: number;
  header: ReadonlyArray<string>;
}>;

const DATE_NAMES = [
  "date",
  "txn date",
  "tran date",
  "value date",
  "posting date",
  "transaction date",
  "date of transaction",
];
const NAME_NAMES = [
  "description",
  "narration",
  "particulars",
  "remarks",
  "details",
  "transaction details",
  "transaction description",
  "transaction remarks",
  "payee",
  "merchant",
  "name",
];
const OUT_NAMES = [
  "withdrawal",
  "withdrawals",
  "withdrawal amt",
  "withdrawal amount",
  "debit",
  "debits",
  "debit amt",
  "debit amount",
  "paid out",
  "money out",
  "dr",
];
const IN_NAMES = [
  "deposit",
  "deposits",
  "deposit amt",
  "deposit amount",
  "credit",
  "credits",
  "credit amt",
  "credit amount",
  "paid in",
  "money in",
  "cr",
];
const AMOUNT_NAMES = [
  "amount",
  "amt",
  "transaction amount",
  "txn amount",
  "value",
];
const CATEGORY_NAMES = ["category", "categories", "tag", "tags"];

const plainly = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const findColumn = (
  header: ReadonlyArray<string>,
  names: ReadonlyArray<string>,
  taken: ReadonlySet<number> = new Set(),
): number =>
  header.findIndex(
    (cell, at) => !taken.has(at) && names.includes(plainly(cell)),
  );

export const readAmount = (value: string): number | null => {
  const text = value.replace(/[\s₹$€£]/g, "").replace(/,/g, "");
  if (!/^-?\d+(\.\d+)?$/.test(text)) return null;

  const amount = Number(text);
  return Number.isFinite(amount) ? amount : null;
};

export const readDate = (value: string): string | null => {
  const text = value.trim();

  const ymd = text.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  const dmy = text.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);

  let year = 0;
  let month = 0;
  let day = 0;

  if (ymd !== null) {
    year = Number(ymd[1]);
    month = Number(ymd[2]);
    day = Number(ymd[3]);
  } else if (dmy !== null) {
    day = Number(dmy[1]);
    month = Number(dmy[2]);
    year = Number(dmy[3]);
    if (year < 100) year += 2000;
  } else {
    return null;
  }

  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const made = new Date(Date.UTC(year, month - 1, day));
  if (made.getUTCMonth() !== month - 1 || made.getUTCDate() !== day) {
    return null;
  }

  return made.toISOString().slice(0, 10);
};

export const read = (text: string): Reading => {
  const rows = splitRows(text);

  let headerAt = -1;
  let dateAt = -1;
  for (let index = 0; index < Math.min(rows.length, 25); index += 1) {
    const found = findColumn(rows[index] ?? [], DATE_NAMES);
    if (found !== -1 && (rows[index]?.length ?? 0) >= 3) {
      headerAt = index;
      dateAt = found;
      break;
    }
  }

  if (headerAt === -1) {
    return { lines: [], skipped: rows.length, header: [] };
  }

  const header = rows[headerAt] ?? [];
  const taken = new Set([dateAt]);
  const claim = (names: ReadonlyArray<string>): number => {
    const at = findColumn(header, names, taken);
    if (at !== -1) taken.add(at);
    return at;
  };

  const nameAt = claim(NAME_NAMES);
  const categoryAt = claim(CATEGORY_NAMES);
  const outAt = claim(OUT_NAMES);
  const inAt = claim(IN_NAMES);
  const amountAt = claim(AMOUNT_NAMES);

  const lines: Line[] = [];
  let skipped = 0;

  for (const row of rows.slice(headerAt + 1)) {
    const occurredOn = readDate(row[dateAt] ?? "");
    if (occurredOn === null) {
      skipped += 1;
      continue;
    }

    const out = outAt === -1 ? null : readAmount(row[outAt] ?? "");
    const paidIn = inAt === -1 ? null : readAmount(row[inAt] ?? "");
    const single = amountAt === -1 ? null : readAmount(row[amountAt] ?? "");

    let amount: number | null = null;
    let direction: "in" | "out" = "out";

    if (out !== null && out !== 0) {
      amount = out;
      direction = "out";
    } else if (paidIn !== null && paidIn !== 0) {
      amount = paidIn;
      direction = "in";
    } else if (single !== null && single !== 0) {
      amount = Math.abs(single);
      direction = single < 0 ? "out" : "in";
    }

    if (amount === null || amount === 0) {
      skipped += 1;
      continue;
    }

    lines.push({
      occurredOn,
      description: (nameAt === -1 ? "" : (row[nameAt] ?? ""))
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 60),
      amountText: String(Math.abs(amount)),
      direction,
      category: (categoryAt === -1 ? "" : (row[categoryAt] ?? "")).trim(),
    });
  }

  return { lines, skipped, header };
};

const mark = (accountId: string, line: Line): string =>
  `import:${accountId}:${line.occurredOn}:${line.direction}:${line.amountText}:${line.description
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 24)}`;

export const fingerprints = (
  accountId: string,
  lines: ReadonlyArray<Line>,
): ReadonlyArray<string> => {
  const runs = new Map<string, number>();

  return lines.map((line) => {
    const base = mark(accountId, line);
    const run = (runs.get(base) ?? 0) + 1;
    runs.set(base, run);
    return run === 1 ? base : `${base}#${run}`;
  });
};
