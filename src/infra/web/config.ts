import { BASE_CURRENCY, isCurrency } from "@/core/money/currency";

export type Env = Readonly<{
  DB: D1Database;
  PEBBLE_BASE_CURRENCY?: string;
}>;

export type Config = Readonly<{
  baseCurrency: string;
}>;

const envString = (env: unknown, key: string): string => {
  if (typeof env === "object" && env !== null && key in env) {
    const value = (env as Record<string, unknown>)[key];
    if (typeof value === "string" && value !== "") return value;
  }
  return "";
};

export const readConfig = (env: unknown): Config => {
  const declared = envString(env, "PEBBLE_BASE_CURRENCY");
  return Object.freeze({
    baseCurrency: isCurrency(declared) ? declared : BASE_CURRENCY,
  });
};
