export type Merchant = Readonly<{
  id: string;
  userId: string;
  normalizedName: string;
  displayName: string;
  defaultCategoryId: string | null;
  seenCount: number;
}>;

export const normalizeMerchant = (name: string): string =>
  name.trim().toLowerCase().replace(/\s+/g, " ");
