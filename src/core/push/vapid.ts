export const base64Url = (bytes: ArrayBuffer | Uint8Array): string => {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";
  for (const byte of view) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
};

export const fromBase64Url = (value: string): Uint8Array<ArrayBuffer> => {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const full = padded.padEnd(
    padded.length + ((4 - (padded.length % 4)) % 4),
    "=",
  );
  return Uint8Array.from(atob(full), (character) => character.charCodeAt(0));
};

/** The audience is the push service's origin, never the whole endpoint. */
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
