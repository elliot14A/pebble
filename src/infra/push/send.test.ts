import { describe, expect, it } from "bun:test";
import { base64Url, fromBase64Url } from "@/core/push";
import { notify, sign, type VapidKeys } from "@/infra/push";

const ENDPOINT = "https://fcm.googleapis.com/fcm/send/abc123";
const NOW = Date.UTC(2026, 7, 9, 12, 0, 0);

const keys = async (): Promise<VapidKeys> => {
  const pair = await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign", "verify"],
  );

  const raw = await crypto.subtle.exportKey("raw", pair.publicKey);
  const jwk = await crypto.subtle.exportKey("jwk", pair.privateKey);

  return {
    publicKey: base64Url(raw),
    privateKey: jwk.d ?? "",
    subject: "mailto:someone@example.com",
  };
};

const decode = (part: string): Record<string, unknown> =>
  JSON.parse(new TextDecoder().decode(fromBase64Url(part))) as Record<
    string,
    unknown
  >;

describe("sign", () => {
  it("produces a token the matching public key accepts", async () => {
    const vapid = await keys();
    const token = await sign(ENDPOINT, vapid, NOW);
    const [header, claim, signature] = token.split(".");

    const raw = fromBase64Url(vapid.publicKey);
    const verifier = await crypto.subtle.importKey(
      "jwk",
      {
        kty: "EC",
        crv: "P-256",
        x: base64Url(raw.slice(1, 33)),
        y: base64Url(raw.slice(33, 65)),
        ext: true,
      },
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["verify"],
    );

    const good = await crypto.subtle.verify(
      { name: "ECDSA", hash: "SHA-256" },
      verifier,
      fromBase64Url(signature ?? ""),
      new TextEncoder().encode(`${header}.${claim}`),
    );

    expect(good).toBe(true);
    expect(fromBase64Url(signature ?? "").length).toBe(64);
  });

  it("claims what RFC 8292 asks for, and no more", async () => {
    const vapid = await keys();
    const token = await sign(ENDPOINT, vapid, NOW);
    const [header, claim] = token.split(".");

    expect(decode(header ?? "")).toEqual({ typ: "JWT", alg: "ES256" });

    const body = decode(claim ?? "");
    expect(body.aud).toBe("https://fcm.googleapis.com");
    expect(body.sub).toBe("mailto:someone@example.com");
    expect(body.exp).toBe(Math.floor(NOW / 1000) + 12 * 60 * 60);
  });
});

describe("notify", () => {
  it("sends the headers a push service expects, and no body", async () => {
    const vapid = await keys();
    let seen: { url: string; init: RequestInit } | null = null;

    const real = globalThis.fetch;
    globalThis.fetch = (async (url: string, init: RequestInit) => {
      seen = { url, init };
      return new Response(null, { status: 201 });
    }) as unknown as typeof fetch;

    const status = await notify(ENDPOINT, vapid, NOW);
    globalThis.fetch = real;

    expect(status.isOk()).toBe(true);
    if (status.isErr()) return;
    expect(status.value).toBe(201);

    const sent = seen as unknown as { url: string; init: RequestInit };
    expect(sent.url).toBe(ENDPOINT);
    expect(sent.init.method).toBe("POST");
    expect(sent.init.body).toBeUndefined();

    const headers = sent.init.headers as Record<string, string>;
    expect(headers.TTL).toBe("86400");
    expect(headers.Authorization).toMatch(
      new RegExp(`^vapid t=[\\w-]+\\.[\\w-]+\\.[\\w-]+, k=${vapid.publicKey}$`),
    );
  });
});
