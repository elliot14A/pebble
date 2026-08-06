const TOKEN_BYTES = 32;
const DAY_MS = 24 * 60 * 60 * 1000;

export const SESSION_DAYS = 30;
export const COOKIE_NAME = "pb_session";

const encoder = new TextEncoder();

const toBase64Url = (bytes: Uint8Array): string =>
  btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

export const newSessionToken = (): string =>
  toBase64Url(crypto.getRandomValues(new Uint8Array(TOKEN_BYTES)));

export const hashToken = async (token: string): Promise<string> => {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(token));
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
};

export const expiryFrom = (now: number): number => now + SESSION_DAYS * DAY_MS;

export const isExpired = (expiresAt: number, now: number): boolean =>
  expiresAt <= now;

export const shouldExtend = (lastSeenAt: number, now: number): boolean =>
  now - lastSeenAt > DAY_MS;
