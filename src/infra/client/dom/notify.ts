const asKey = (base64: string): Uint8Array<ArrayBuffer> => {
  const padded = base64.replace(/-/g, "+").replace(/_/g, "/");
  const full = padded.padEnd(
    padded.length + ((4 - (padded.length % 4)) % 4),
    "=",
  );
  return Uint8Array.from(atob(full), (character) => character.charCodeAt(0));
};

export const canNotify = (): boolean =>
  "Notification" in window &&
  "serviceWorker" in navigator &&
  "PushManager" in window;

export const subscribed = async (): Promise<boolean> => {
  if (!canNotify()) return false;
  const registration = await navigator.serviceWorker.getRegistration();
  const existing = await registration?.pushManager.getSubscription();
  return existing != null;
};

export const turnOn = async (): Promise<string> => {
  if (!canNotify()) return "This browser cannot show notifications.";

  const allowed = await Notification.requestPermission();
  if (allowed !== "granted") return "Notifications were not allowed.";

  const reply = await window.fetch("/push/key");
  if (!reply.ok) return "Notifications are not switched on yet.";

  const { publicKey } = (await reply.json()) as { publicKey: string };
  const registration = await navigator.serviceWorker.ready;

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: asKey(publicKey),
  });

  const saved = await window.fetch("/push/subscribe", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ endpoint: subscription.endpoint }),
  });

  return saved.ok ? "On. Bills will nudge you." : "Could not save that.";
};

export const turnOff = async (): Promise<string> => {
  const registration = await navigator.serviceWorker.getRegistration();
  const existing = await registration?.pushManager.getSubscription();
  if (existing == null) return "Off.";

  await window.fetch("/push/unsubscribe", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ endpoint: existing.endpoint }),
  });
  await existing.unsubscribe();

  return "Off.";
};

export const sendTest = async (): Promise<string> => {
  const reply = await window.fetch("/push/test", { method: "POST" });
  const said = (await reply.json()) as {
    error?: string;
    devices?: number;
    accepted?: number;
    replies?: ReadonlyArray<number>;
  };

  if (!reply.ok) return said.error ?? "Could not send it.";
  if ((said.accepted ?? 0) === 0) {
    return `Refused by the push service (${(said.replies ?? []).join(", ")}).`;
  }

  return said.accepted === said.devices
    ? "Sent. It should arrive in a moment."
    : `Sent to ${said.accepted} of ${said.devices} devices.`;
};

export const notifyToggle = () => ({
  on: false,
  note: "",
  busy: false,

  async init(this: { on: boolean }) {
    this.on = await subscribed();
  },

  async toggle(this: { on: boolean; note: string; busy: boolean }) {
    this.busy = true;
    this.note = this.on ? await turnOff() : await turnOn();
    this.on = await subscribed();
    this.busy = false;
  },

  async test(this: { note: string; busy: boolean }) {
    this.busy = true;
    this.note = "Sending…";
    try {
      this.note = await sendTest();
    } catch {
      this.note = "Could not reach pebble.";
    }
    this.busy = false;
  },
});
