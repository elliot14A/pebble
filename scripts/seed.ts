#!/usr/bin/env bun

import { hashPassword } from "@/core/auth";
import { accountsFor, defaultCategories, userNamed } from "@/infra/d1/seedData";

const PEOPLE = [["u-akshith", "akshith", "Akshith", "super_admin"]] as const;

const TEMPORARY_PASSWORD = "pebble-start";

const remote = process.argv.includes("--remote");
const now = Date.now();

const quote = (value: string | number | null): string => {
  if (value === null) return "null";
  if (typeof value === "number") return String(value);
  return `'${value.replaceAll("'", "''")}'`;
};

const insert = (
  table: string,
  row: Readonly<Record<string, string | number | null>>,
): string => {
  const columns = Object.keys(row).join(", ");
  const values = Object.values(row).map(quote).join(", ");
  return `insert or replace into ${table} (${columns}) values (${values});`;
};

const statements: string[] = [];

for (const category of defaultCategories) {
  statements.push(
    insert("categories", {
      id: category.id,
      owner_id: category.ownerId,
      name: category.name,
      slug: category.slug,
      kind: category.kind,
      glyph: category.glyph,
      tint: category.tint,
      parent_id: category.parentId,
      sort_order: category.sortOrder,
      archived_at: category.archivedAt,
    }),
  );
}

const temporaryHash = await hashPassword(TEMPORARY_PASSWORD);

for (const [index, [id, username, displayName, role]] of PEOPLE.entries()) {
  const user = userNamed(id, username, displayName, role, now + index);
  statements.push(
    insert("users", {
      id: user.id,
      username: user.username,
      display_name: user.displayName,
      role: user.role,
      base_currency: user.baseCurrency,
      password_hash: temporaryHash,
      status: user.status,
      must_change_password: 1,
      failed_attempts: 0,
      locked_until: null,
      created_at: user.createdAt,
    }),
  );

  for (const account of accountsFor(id)) {
    statements.push(
      insert("accounts", {
        id: account.id,
        user_id: account.userId,
        name: account.name,
        kind: account.kind,
        currency: account.currency,
        opening_balance_minor: account.openingBalanceMinor,
        sort_order: account.sortOrder,
        archived_at: account.archivedAt,
      }),
    );
  }
}

const file = ".wrangler/seed.sql";
await Bun.write(file, `${statements.join("\n")}\n`);

const applied =
  await Bun.$`bunx wrangler d1 execute pebble ${remote ? "--remote" : "--local"} --file ${file} --yes`
    .quiet()
    .nothrow();

if (applied.exitCode !== 0) {
  process.stderr.write(applied.stderr.toString());
  process.exit(1);
}

const accountCount = PEOPLE.reduce(
  (total, [id]) => total + accountsFor(id).length,
  0,
);

process.stdout.write(
  `seeded ${PEOPLE.length} people, ${defaultCategories.length} categories, ` +
    `${accountCount} accounts (${remote ? "remote" : "local"})\n` +
    `everyone signs in with the password ${TEMPORARY_PASSWORD} and is asked to change it\n`,
);
