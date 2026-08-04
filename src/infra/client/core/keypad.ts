export type Keypad = Readonly<{
  text: string;
  decimals: number;
}>;

export const empty = (decimals: number): Keypad => ({ text: "", decimals });

const digitsAfterPoint = (text: string): number => {
  const point = text.indexOf(".");
  return point === -1 ? 0 : text.length - point - 1;
};

export const press = (keypad: Keypad, key: string): Keypad => {
  const { text, decimals } = keypad;

  if (key === ".") {
    if (decimals === 0 || text.includes(".")) return keypad;
    return { ...keypad, text: text === "" ? "0." : `${text}.` };
  }

  if (!/^\d+$/.test(key)) return keypad;

  if (digitsAfterPoint(text) + key.length > decimals && text.includes(".")) {
    return keypad;
  }

  if (text === "0") return { ...keypad, text: key };
  if (text === "" && key === "00") return keypad;

  return { ...keypad, text: text + key };
};

export const backspace = (keypad: Keypad): Keypad => ({
  ...keypad,
  text: keypad.text.slice(0, -1),
});

export const display = (keypad: Keypad): string =>
  keypad.text === "" ? "0" : keypad.text;

export const isReady = (keypad: Keypad): boolean =>
  keypad.text !== "" && keypad.text !== "." && Number(keypad.text) > 0;

export const withDecimals = (keypad: Keypad, decimals: number): Keypad => {
  if (decimals === keypad.decimals) return keypad;
  if (decimals === 0) {
    const point = keypad.text.indexOf(".");
    return {
      decimals,
      text: point === -1 ? keypad.text : keypad.text.slice(0, point),
    };
  }
  const extra = digitsAfterPoint(keypad.text) - decimals;
  return {
    decimals,
    text: extra > 0 ? keypad.text.slice(0, -extra) : keypad.text,
  };
};

export const fromText = (text: string, decimals: number): Keypad => {
  const cleaned = text.replace(/[^0-9.]/g, "");
  const point = cleaned.indexOf(".");

  if (point === -1) return { text: cleaned, decimals };

  const whole = cleaned.slice(0, point);
  const fraction = cleaned
    .slice(point + 1)
    .replace(/\./g, "")
    .slice(0, decimals);

  if (decimals === 0) return { text: whole, decimals };
  return { text: fraction === "" ? whole : `${whole}.${fraction}`, decimals };
};
