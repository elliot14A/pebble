import { hex, randomToken } from "@/core/bytes";

const TOKEN_BYTES = 32;
const DAY_MS = 24 * 60 * 60 * 1000;

export const SESSION_DAYS = 30;
export const COOKIE_NAME = "pb_session";

const encoder = new TextEncoder();

export const newSessionToken = (): string => randomToken(TOKEN_BYTES);

export const hashToken = async (token: string): Promise<string> =>
  hex(await crypto.subtle.digest("SHA-256", encoder.encode(token)));

export const expiryFrom = (now: number): number => now + SESSION_DAYS * DAY_MS;

export const isExpired = (expiresAt: number, now: number): boolean =>
  expiresAt <= now;

export const shouldExtend = (lastSeenAt: number, now: number): boolean =>
  now - lastSeenAt > DAY_MS;
