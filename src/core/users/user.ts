export const ROLES = ["super_admin", "user"] as const;
export type Role = (typeof ROLES)[number];

export type User = Readonly<{
  id: string;
  username: string;
  displayName: string;
  role: Role;
  baseCurrency: string;
  passwordHash: string | null;
  status: "active" | "disabled";
  mustChangePassword: boolean;
  failedAttempts: number;
  lockedUntil: number | null;
  createdAt: number;
}>;

export const initials = (user: User): string =>
  user.displayName.trim().slice(0, 1).toUpperCase() || "?";
