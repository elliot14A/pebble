import {
  add,
  bodyOf,
  drop,
  type Queued,
  read,
  verdictOf,
  write,
} from "@/infra/client/core/outbox";

const KEY = "pebble.outbox";

const load = (): ReadonlyArray<Queued> => {
  try {
    return read(window.localStorage.getItem(KEY));
  } catch {
    return [];
  }
};

const store = (queue: ReadonlyArray<Queued>): void => {
  try {
    window.localStorage.setItem(KEY, write(queue));
  } catch {}
};

export const waiting = (): number => load().length;

const show = (): void => {
  const count = waiting();
  for (const node of document.querySelectorAll<HTMLElement>("[data-outbox]")) {
    node.textContent = count === 0 ? "" : `${count} waiting to sync`;
    node.hidden = count === 0;
  }
};

export const queue = (form: HTMLFormElement): void => {
  const data = new FormData(form);
  const clientId = String(data.get("clientId") ?? "");
  if (clientId === "") return;

  const fields: Array<readonly [string, string]> = [];
  for (const [name, value] of data.entries()) {
    if (typeof value === "string") fields.push([name, value] as const);
  }

  store(add(load(), { clientId, fields, at: Date.now() }));
  show();
};

export const flush = async (): Promise<number> => {
  let sent = 0;

  for (const entry of load()) {
    try {
      const reply = await window.fetch("/transactions", {
        method: "POST",
        body: bodyOf(entry),
        redirect: "manual",
      });

      const verdict = verdictOf(reply.status, reply.type);
      if (verdict === "keep") break;

      store(drop(load(), entry.clientId));
      if (verdict === "sent") sent += 1;
    } catch {
      break;
    }
  }

  show();
  return sent;
};

export const watchOutbox = (): void => {
  show();
  void flush();

  window.addEventListener("online", () => {
    void flush().then((sent) => {
      show();
      if (sent > 0) window.location.reload();
    });
  });
};
