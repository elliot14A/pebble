import {
  backspace,
  display,
  empty,
  fromText,
  isReady,
  type Keypad,
  press,
  withDecimals,
} from "@/client/core/keypad";
import { shrink } from "@/client/dom/shrink";
import { normalizeMerchant } from "@/core/merchants";
import { displayMoney, parseAmount } from "@/core/money";
import { convert, formatRate } from "@/core/rates";

export type QuickAddConfig = Readonly<{
  accountCurrency: Record<string, string>;
  currencies: Record<string, { symbol: string; exponent: number }>;
  rates: Record<string, number>;
  merchants: ReadonlyArray<{ name: string; categoryId: string | null }>;
  categoryKinds: Record<string, "income" | "expense" | "both">;
  base: string;
  defaultAccountId: string | null;
  today: string;

  reloadOnSave: boolean;
}>;

const SUGGESTIONS = 6;

export const quickAdd = (config: QuickAddConfig) => ({
  open: false,
  showAll: false,
  type: "expense" as "expense" | "income" | "transfer",
  accountId: config.defaultAccountId ?? "",
  counterAccountId: "",
  categoryId: "",
  occurredOn: config.today,
  note: "",
  clientId: "",
  receiptId: "",
  scanning: false,
  scanFailed: false,
  scanNote: "",
  preview: "",
  flash: { amount: false, name: false, date: false },
  pad: empty(2) as Keypad,

  openSheet(): void {
    this.pad = empty(this.decimals());
    this.receiptId = "";
    this.scanNote = "";
    this.scanning = false;
    this.scanFailed = false;
    this.forgetPreview();
    this.flash = { amount: false, name: false, date: false };
    this.categoryId = "";
    this.type = "expense";
    this.accountId = config.defaultAccountId ?? "";
    this.occurredOn = config.today;
    this.note = "";
    this.counterAccountId = "";

    this.clientId = crypto.randomUUID();
    this.open = true;
    this.showAll = false;
  },

  close(): void {
    this.open = false;
    this.forgetPreview();
  },

  today(): string {
    return config.today;
  },

  yesterday(): string {
    const day = new Date(`${config.today}T00:00:00Z`);
    day.setUTCDate(day.getUTCDate() - 1);
    return day.toISOString().slice(0, 10);
  },

  currency(): string {
    return config.accountCurrency[this.accountId] ?? config.base;
  },

  decimals(): number {
    return config.currencies[this.currency()]?.exponent ?? 2;
  },

  symbol(): string {
    return config.currencies[this.currency()]?.symbol ?? "";
  },

  get amountText(): string {
    return this.pad.text;
  },

  display(): string {
    return display(this.pad);
  },

  missing(): string {
    if (!isReady(this.pad)) return "Enter an amount";
    if (this.type !== "transfer" && this.note.trim() === "") {
      return "Say what it was";
    }
    if (this.accountId === "") return "Pick an account";
    if (this.type === "transfer") {
      if (this.counterAccountId === "") return "Pick where it goes";
      if (this.counterAccountId === this.accountId) {
        return "Pick a different account";
      }
    }
    return "";
  },

  ready(): boolean {
    return this.missing() === "";
  },

  saveLabel(): string {
    const missing = this.missing();
    return missing === "" ? "Save" : missing;
  },

  async scan(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = "";
    if (file === undefined) return;

    this.forgetPreview();
    this.preview = URL.createObjectURL(file);
    this.scanning = true;
    this.scanFailed = false;
    this.scanNote = "";

    const settle = async (): Promise<void> => {
      const body = new FormData();
      body.append("photo", await shrink(file));
      const reply = await window.fetch("/receipts/scan", {
        method: "POST",
        body,
      });
      const data = (await reply.json()) as {
        id?: string;
        amountText?: string | null;
        name?: string | null;
        occurredOn?: string | null;
        error?: string;
      };

      if (!reply.ok) {
        this.scanFailed = true;
        this.scanNote = data.error ?? "Could not read that receipt.";
        return;
      }

      this.receiptId = data.id ?? "";
      const found: string[] = [];

      if (data.amountText) {
        this.pad = fromText(data.amountText, this.decimals());
        await this.lit("amount");
        found.push("amount");
      }
      if (data.name) {
        this.note = data.name;
        await this.lit("name");
        found.push("shop");
      }
      if (data.occurredOn) {
        this.occurredOn = data.occurredOn;
        await this.lit("date");
        found.push("date");
      }

      this.scanFailed = found.length === 0;
      this.scanNote =
        found.length === 0
          ? "Receipt saved, but nothing could be read. Type it in."
          : `Read the ${found.join(", ")}. Check it.`;
    };

    try {
      await settle();
    } catch {
      this.scanFailed = true;
      this.scanNote = "Could not reach the scanner.";
    } finally {
      this.scanning = false;
    }
  },

  forgetPreview(): void {
    if (this.preview !== "") URL.revokeObjectURL(this.preview);
    this.preview = "";
  },

  lit(field: "amount" | "name" | "date"): Promise<void> {
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.flash = { ...this.flash, [field]: true };

    return new Promise((done) => {
      window.setTimeout(
        () => {
          this.flash = { ...this.flash, [field]: false };
          done();
        },
        still ? 0 : 260,
      );
    });
  },

  press(key: string): void {
    this.pad = press(withDecimals(this.pad, this.decimals()), key);
  },

  backspace(): void {
    this.pad = backspace(this.pad);
  },

  advance(step: string): void {
    const target = document.querySelector<HTMLElement>(`[data-step="${step}"]`);
    if (target === null) return;

    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    requestAnimationFrame(() => {
      target.scrollIntoView({
        behavior: still ? "auto" : "smooth",
        block: "nearest",
      });
    });
  },

  suggestions(): ReadonlyArray<{ name: string; categoryId: string | null }> {
    if (this.type === "transfer") return [];

    const typed = normalizeMerchant(this.note);
    const matching = config.merchants.filter((shop) =>
      normalizeMerchant(shop.name).includes(typed),
    );

    if (
      matching.length === 1 &&
      normalizeMerchant(matching[0]?.name ?? "") === typed
    ) {
      return [];
    }
    return matching.slice(0, SUGGESTIONS);
  },

  pickMerchant(shop: { name: string; categoryId: string | null }): void {
    this.note = shop.name;
    if (shop.categoryId !== null && this.categoryId === "") {
      this.categoryId = shop.categoryId;
    }
    this.advance("account");
  },

  allows(id: string, type: string): boolean {
    const kind = config.categoryKinds[id];
    if (kind === undefined) return false;
    return kind === "both" || kind === type;
  },

  countFor(type: string): number {
    return Object.keys(config.categoryKinds).filter((id) =>
      this.allows(id, type),
    ).length;
  },

  setType(next: "expense" | "income" | "transfer"): void {
    this.type = next;
    this.showAll = false;
    if (this.categoryId !== "" && !this.allows(this.categoryId, next)) {
      this.categoryId = "";
    }
  },

  pickCategory(id: string): void {
    const picked = this.categoryId === id ? "" : id;
    this.categoryId = picked;
    if (picked === "") return;

    this.showAll = false;
    this.advance("account");
  },

  pickAccount(id: string): void {
    this.accountId = id;
    this.advance("when");
  },

  hint(): string {
    const currency = this.currency();
    if (currency === config.base) return "Today";

    const rateE8 = config.rates[currency];
    if (rateE8 === undefined) {
      return `No ${currency} rate yet, it will save anyway`;
    }

    const baseSymbol = config.currencies[config.base]?.symbol ?? "";
    const quoted = `1 ${currency} = ${baseSymbol}${formatRate(rateE8)}`;
    if (!isReady(this.pad)) return quoted;

    const amount = parseAmount(this.pad.text, currency);
    if (amount.isErr()) return quoted;

    const base = convert(amount.value, config.base, rateE8);
    if (base.isErr()) return quoted;

    return `${displayMoney(base.value)}  ·  ${quoted}`;
  },

  saved(event: CustomEvent & { detail?: { successful?: boolean } }): void {
    if (event.detail?.successful === false) return;
    this.stow(true);
  },

  stow(
    this: { open: boolean; pad: Keypad; decimals: () => number },
    reload: boolean,
  ): void {
    this.open = false;
    this.pad = empty(this.decimals());

    if (reload && config.reloadOnSave) {
      window.setTimeout(() => window.location.reload(), 220);
    }
  },
});
