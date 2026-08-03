const ALPHABET = "0123456789abcdefghjkmnpqrstvwxyz";
const TIME_CHARS = 10;
const RANDOM_CHARS = 16;

const encodeTime = (millis: number): string => {
  let rest = millis;
  let out = "";
  for (let index = 0; index < TIME_CHARS; index += 1) {
    out = `${ALPHABET[rest % 32]}${out}`;
    rest = Math.floor(rest / 32);
  }
  return out;
};

const encodeRandom = (): string => {
  const bytes = crypto.getRandomValues(new Uint8Array(RANDOM_CHARS));
  let out = "";
  for (const byte of bytes) out += ALPHABET[byte % 32];
  return out;
};

export const newId = (now: number): string => encodeTime(now) + encodeRandom();
