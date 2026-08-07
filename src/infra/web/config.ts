import { BASE_CURRENCY, isCurrency } from "@/core/money/currency";

export type Env = Readonly<{
  DB: D1Database;
  PEBBLE_BASE_CURRENCY?: string;
  PEBBLE_OPENAI_BASE_URL?: string;
  PEBBLE_OPENAI_API_KEY?: string;
  PEBBLE_OPENAI_MODEL?: string;
  PEBBLE_OPENAI_EXTRA_BODY?: string;
}>;

export type Config = Readonly<{
  baseCurrency: string;
}>;

export type LlmConfig = Readonly<{
  baseUrl: string;
  apiKey: string;
  model: string;
  extraBody: Readonly<Record<string, unknown>>;
}>;

const envString = (env: unknown, key: string, fallback = ""): string => {
  if (typeof env === "object" && env !== null && key in env) {
    const value = (env as Record<string, unknown>)[key];
    if (typeof value === "string" && value !== "") return value;
  }
  return fallback;
};

const envJson = (env: unknown, key: string): Record<string, unknown> => {
  const raw = envString(env, key);
  if (raw === "") return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    return typeof parsed === "object" && parsed !== null
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
};

export const readConfig = (env: unknown): Config => {
  const declared = envString(env, "PEBBLE_BASE_CURRENCY");
  return Object.freeze({
    baseCurrency: isCurrency(declared) ? declared : BASE_CURRENCY,
  });
};

export const readLlmConfig = (env: unknown): LlmConfig => ({
  baseUrl: envString(
    env,
    "PEBBLE_OPENAI_BASE_URL",
    "https://openrouter.ai/api/v1",
  ),
  apiKey: envString(env, "PEBBLE_OPENAI_API_KEY"),
  model: envString(env, "PEBBLE_OPENAI_MODEL", "qwen/qwen3.7-flash"),
  extraBody: envJson(env, "PEBBLE_OPENAI_EXTRA_BODY"),
});
