import type { Account } from "@/core/accounts";
import type { Category } from "@/core/categories";
import type { User } from "@/core/users";

export const defaultCategories: ReadonlyArray<Category> = [
  ["food", "Food", "expense", "food", "money"],
  ["fuel", "Fuel", "expense", "fuel", "money"],
  ["groceries", "Groceries", "expense", "groceries", "money"],
  ["rent", "Rent", "expense", "home", "warn"],
  ["bills", "Bills", "expense", "bolt", "warn"],
  ["shopping", "Shopping", "expense", "bag", "money"],
  ["travel", "Travel", "expense", "plane", "money"],
  ["fun", "Fun", "expense", "play", "money"],
  ["health", "Health", "expense", "health", "over"],
  ["education", "Education", "expense", "book", "money"],
  ["investments", "Investments", "both", "coins", "move"],
  ["salary", "Salary", "income", "salary", "money"],
  ["freelance", "Freelance", "income", "trend", "money"],
  ["misc", "Miscellaneous", "both", "dots", "flat"],
].map(([slug, name, kind, glyph, tint], index) => ({
  id: `cat-${slug}`,
  ownerId: null,
  name: name as string,
  slug: slug as string,
  kind: kind as Category["kind"],
  glyph: glyph as Category["glyph"],
  tint: tint as Category["tint"],
  parentId: null,
  sortOrder: index,
  archivedAt: null,
}));

export const userNamed = (
  id: string,
  username: string,
  displayName: string,
  role: User["role"],
  createdAt: number,
): User => ({
  id,
  username,
  displayName,
  role,
  baseCurrency: "INR",
  passwordHash: null,
  status: "active",
  mustChangePassword: true,
  failedAttempts: 0,
  lockedUntil: null,
  createdAt,
});

export const accountsFor = (userId: string): ReadonlyArray<Account> =>
  [
    ["bank", "HDFC Savings", "INR", 0],
    ["cash", "Cash", "INR", 0],
    ["credit_card", "ICICI Credit", "INR", 0],

    ["wallet", "Other", "INR", 0],
  ].map(([kind, name, currency, opening], index) => ({
    id: `acc-${userId}-${index}`,
    userId,
    name: name as string,
    kind: kind as Account["kind"],
    currency: currency as string,
    openingBalanceMinor: opening as number,
    sortOrder: index,
    archivedAt: null,
  }));
