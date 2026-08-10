export { base64Url, fromBase64Url } from "@/core/bytes";

export const audienceOf = (endpoint: string): string =>
  new URL(endpoint).origin;

export const claimFor = (
  endpoint: string,
  subject: string,
  now: number,
  hours = 12,
): Record<string, unknown> => ({
  aud: audienceOf(endpoint),
  exp: Math.floor(now / 1000) + hours * 60 * 60,
  sub: subject,
});
