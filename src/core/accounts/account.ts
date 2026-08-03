export const ACCOUNT_KINDS = [
  "cash",
  "bank",
  "upi",
  "credit_card",
  "savings",
  "wallet",
] as const;

export type AccountKind = (typeof ACCOUNT_KINDS)[number];

export const isAccountKind = (value: string): value is AccountKind =>
  (ACCOUNT_KINDS as ReadonlyArray<string>).includes(value);

export type Account = Readonly<{
  id: string;
  userId: string;
  name: string;
  kind: AccountKind;
  currency: string;
  openingBalanceMinor: number;
  sortOrder: number;
  archivedAt: number | null;
}>;

export const ACCOUNT_KIND_LABEL: Readonly<Record<AccountKind, string>> = {
  cash: "Cash",
  bank: "Bank",
  upi: "UPI",
  credit_card: "Credit card",
  savings: "Savings",
  wallet: "Wallet",
};

export const isLiability = (account: Account): boolean =>
  account.kind === "credit_card";
