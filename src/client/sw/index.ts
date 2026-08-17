type InstallEvent = { waitUntil: (work: Promise<unknown>) => void };
type FetchEvent = {
  request: Request;
  respondWith: (response: Promise<Response>) => void;
};

type PushEvent = { waitUntil: (work: Promise<unknown>) => void };
type NotificationEvent = {
  action: string;
  notification: { close: () => void; data?: { ruleId?: string | null } };
  waitUntil: (work: Promise<unknown>) => void;
};

type WorkerScope = {
  addEventListener: {
    (
      type: "install" | "activate",
      handler: (event: InstallEvent) => void,
    ): void;
    (type: "fetch", handler: (event: FetchEvent) => void): void;
    (type: "push", handler: (event: PushEvent) => void): void;
    (
      type: "notificationclick",
      handler: (event: NotificationEvent) => void,
    ): void;
  };
  skipWaiting: () => Promise<void>;
  registration: {
    showNotification: (
      title: string,
      options?: Record<string, unknown>,
    ) => Promise<void>;
  };
  clients: {
    claim: () => Promise<void>;
    openWindow: (url: string) => Promise<unknown>;
  };
  location: { origin: string };
};

const worker = self as unknown as WorkerScope;

const VERSION = "pebble-__BUILD__";

const SHELL = [
  "/css/app.css",
  "/js/client.js",
  "/js/htmx.js",
  "/fonts/GeistMono-Regular.woff2",
  "/fonts/GeistMono-Medium.woff2",
  "/fonts/GeistMono-SemiBold.woff2",
  "/fonts/GeistMono-Bold.woff2",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/badge-96.png",
];

worker.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      .then((cache) => cache.addAll(SHELL))
      .then(() => worker.skipWaiting()),
  );
});

worker.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== VERSION)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => worker.clients.claim()),
  );
});

const networkFirst = async (request: Request): Promise<Response> => {
  try {
    const response = await fetch(request);
    const copy = response.clone();
    void caches.open(VERSION).then((cache) => cache.put(request, copy));
    return response;
  } catch {
    const hit = await caches.match(request);
    return (
      hit ??
      new Response("Offline, and this page has not been opened before.", {
        status: 503,
        headers: { "content-type": "text/plain; charset=utf-8" },
      })
    );
  }
};

worker.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== worker.location.origin) return;

  event.respondWith(networkFirst(request));
});

const askWhatToSay = async (): Promise<void> => {
  try {
    const reply = await fetch("/push/waiting", { credentials: "include" });
    if (!reply.ok) return;

    const said = (await reply.json()) as {
      title?: string | null;
      body?: string;
    };
    if (!said.title) return;

    await worker.registration.showNotification(said.title, {
      body: said.body ?? "",
      icon: "/icons/icon-180.png",
      badge: "/icons/icon.svg",
      tag: "pebble-bills",
      data: { url: "/settings/repeating" },
    });
  } catch {
    return;
  }
};

worker.addEventListener("push", (event) => {
  event.waitUntil(askWhatToSay());
});

const markPaid = async (ruleId: string): Promise<void> => {
  const body = new FormData();
  body.append("id", ruleId);

  try {
    await fetch("/recurring/pay", {
      method: "POST",
      body,
      credentials: "include",
      redirect: "manual",
    });
    await worker.registration.showNotification("Logged it", {
      body: "The bill is in your ledger and moved to next time.",
      icon: "/icons/icon-192.png",
      badge: "/icons/badge-96.png",
      tag: "pebble-bills",
    });
  } catch {
    await worker.clients.openWindow("/settings/repeating");
  }
};

worker.addEventListener("notificationclick", (event) => {
  const ruleId = event.notification.data?.ruleId ?? null;
  event.notification.close();

  event.waitUntil(
    event.action === "paid" && ruleId !== null
      ? markPaid(ruleId)
      : worker.clients.openWindow("/settings/repeating"),
  );
});
