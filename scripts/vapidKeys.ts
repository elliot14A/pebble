#!/usr/bin/env bun

const base64Url = (bytes: ArrayBuffer | Uint8Array): string => {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  return btoa(String.fromCharCode(...view))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
};

const pair = await crypto.subtle.generateKey(
  { name: "ECDSA", namedCurve: "P-256" },
  true,
  ["sign", "verify"],
);

const raw = await crypto.subtle.exportKey("raw", pair.publicKey);
const jwk = await crypto.subtle.exportKey("jwk", pair.privateKey);

process.stdout.write(
  [
    `PEBBLE_VAPID_PUBLIC_KEY=${base64Url(raw)}`,
    `PEBBLE_VAPID_PRIVATE_KEY=${jwk.d ?? ""}`,
    "PEBBLE_VAPID_SUBJECT=mailto:akshithkatkuri14@gmail.com",
    "",
  ].join("\n"),
);
