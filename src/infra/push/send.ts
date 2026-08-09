import { ResultAsync } from "neverthrow";
import { type AppResultAsync, appError, SystemErrorCode } from "@/core/error";
import { base64Url, claimFor, fromBase64Url } from "@/core/push";

export type VapidKeys = Readonly<{
  publicKey: string;
  privateKey: string;
  subject: string;
}>;

const importKey = (
  privateKey: string,
  publicKey: string,
): Promise<CryptoKey> => {
  const raw = fromBase64Url(publicKey);
  return crypto.subtle.importKey(
    "jwk",
    {
      kty: "EC",
      crv: "P-256",
      d: privateKey,
      x: base64Url(raw.slice(1, 33)),
      y: base64Url(raw.slice(33, 65)),
      ext: true,
    },
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
};

const sign = async (
  endpoint: string,
  keys: VapidKeys,
  now: number,
): Promise<string> => {
  const header = base64Url(
    new TextEncoder().encode(JSON.stringify({ typ: "JWT", alg: "ES256" })),
  );
  const claim = base64Url(
    new TextEncoder().encode(
      JSON.stringify(claimFor(endpoint, keys.subject, now)),
    ),
  );

  const body = `${header}.${claim}`;
  const key = await importKey(keys.privateKey, keys.publicKey);
  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    new TextEncoder().encode(body),
  );

  return `${body}.${base64Url(signature)}`;
};

export const notify = (
  endpoint: string,
  keys: VapidKeys,
  now: number,
): AppResultAsync<number> =>
  ResultAsync.fromPromise(
    sign(endpoint, keys, now).then((token) =>
      fetch(endpoint, {
        method: "POST",
        headers: {
          TTL: "86400",
          Urgency: "normal",
          Authorization: `vapid t=${token}, k=${keys.publicKey}`,
        },
      }).then((reply) => reply.status),
    ),
    (cause) =>
      appError(SystemErrorCode.INTERNAL, "Could not send that notification.", {
        cause,
      }),
  );
