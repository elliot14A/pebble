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
}>;

const DATE_WORDS = ["date", "txn date", "value date", "transaction date"];
const NAME_WORDS = [
  "narration",
  "description",
  "particulars",
  "remarks",
  "details",
  "transaction",
];
const OUT_WORDS = ["withdrawal", "debit", "paid out", "money out", "dr"];
const IN_WORDS = ["deposit", "credit", "paid in", "money in", "cr"];
const AMOUNT_WORDS = ["amount", "amt"];
const CATEGORY_WORDS = ["category", "tag"];

const tidy = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const findColumn = (
  header: ReadonlyArray<string>,
  words: ReadonlyArray<string>,
  avoid: ReadonlyArray<string> = [],
): number =>
  header.findIndex((cell) => {
    const name = tidy(cell);
    if (name === "") return false;
    if (avoid.some((word) => name.includes(word))) return false;
    return words.some((word) => name.includes(word));
  });

export const readAmount = (value: string): number | null => {
  const cleaned = value.replace(/[^0-9.,-]/g, "").replace(/,/g, "");
  if (cleaned === "" || cleaned === "-") return null;

  const amount = Number(cleaned);
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
    const found = findColumn(rows[index] ?? [], DATE_WORDS);
    if (found !== -1 && (rows[index]?.length ?? 0) >= 3) {
      headerAt = index;
      dateAt = found;
      break;
    }
  }

  if (headerAt === -1) return { lines: [], skipped: rows.length };

  const header = rows[headerAt] ?? [];
  const nameAt = findColumn(header, NAME_WORDS);
  const outAt = findColumn(header, OUT_WORDS);
  const inAt = findColumn(header, IN_WORDS);
  const categoryAt = findColumn(header, CATEGORY_WORDS);
  const amountAt = findColumn(header, AMOUNT_WORDS, [
    ...OUT_WORDS,
    ...IN_WORDS,
    "balance",
  ]);

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

  return { lines, skipped };
};

export const fingerprint = (accountId: string, line: Line): string =>
  `import:${accountId}:${line.occurredOn}:${line.direction}:${line.amountText}:${line.description
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 24)}`;
