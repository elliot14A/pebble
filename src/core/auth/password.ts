import { err, ok } from "neverthrow";
import { type AppResult, appError, ValidationErrorCode } from "@/core/error";

const ALGORITHM = "pbkdf2";
const DIGEST = "sha256";
export const MAX_ITERATIONS = 100_000;
const ITERATIONS = MAX_ITERATIONS;
const SALT_BYTES = 16;
const KEY_BITS = 256;
const MIN_LENGTH = 8;

const encoder = new TextEncoder();

const toBase64 = (bytes: Uint8Array): string =>
  btoa(String.fromCharCode(...bytes));

const fromBase64 = (value: string): Uint8Array<ArrayBuffer> =>
  Uint8Array.from(atob(value), (character) => character.charCodeAt(0));

const derive = async (
  plain: string,
  salt: Uint8Array<ArrayBuffer>,
  iterations: number,
): Promise<Uint8Array> => {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(plain),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    key,
    KEY_BITS,
  );
  return new Uint8Array(bits);
};

const sameBytes = (a: Uint8Array, b: Uint8Array): boolean => {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let index = 0; index < a.length; index += 1) {
    difference |= (a[index] ?? 0) ^ (b[index] ?? 0);
  }
  return difference === 0;
};

export const hashPassword = async (plain: string): Promise<string> => {
  const salt = crypto.getRandomValues(
    new Uint8Array(SALT_BYTES),
  ) as Uint8Array<ArrayBuffer>;
  const derived = await derive(plain, salt, ITERATIONS);
  return [
    ALGORITHM,
    DIGEST,
    ITERATIONS,
    toBase64(salt),
    toBase64(derived),
  ].join("$");
};

const DUMMY_SALT = new Uint8Array(SALT_BYTES) as Uint8Array<ArrayBuffer>;

export const burnPasswordTime = async (plain: string): Promise<false> => {
  await derive(plain, DUMMY_SALT, ITERATIONS);
  return false;
};

export const verifyPassword = async (
  plain: string,
  stored: string | null,
): Promise<boolean> => {
  if (stored === null) return false;

  const parts = stored.split("$");
  if (parts.length !== 5) return false;

  const [algorithm, digest, iterations, salt, expected] = parts;
  if (algorithm !== ALGORITHM || digest !== DIGEST) return false;

  const rounds = Number(iterations);
  if (!Number.isSafeInteger(rounds) || rounds <= 0) return false;

  try {
    const derived = await derive(plain, fromBase64(salt ?? ""), rounds);
    return sameBytes(derived, fromBase64(expected ?? ""));
  } catch {
    return false;
  }
};

export const needsRehash = (stored: string | null): boolean => {
  if (stored === null) return true;
  const parts = stored.split("$");
  return (
    parts.length !== 5 ||
    parts[0] !== ALGORITHM ||
    parts[1] !== DIGEST ||
    Number(parts[2]) !== ITERATIONS
  );
};

export const checkPassword = (plain: string): AppResult<string> => {
  if (plain.length < MIN_LENGTH) {
    return err(
      appError(
        ValidationErrorCode.INVALID_INPUT,
        `A password needs at least ${MIN_LENGTH} characters.`,
      ),
    );
  }
  if (plain.trim() === "") {
    return err(
      appError(
        ValidationErrorCode.INVALID_INPUT,
        "A password cannot be only spaces.",
      ),
    );
  }
  return ok(plain);
};
