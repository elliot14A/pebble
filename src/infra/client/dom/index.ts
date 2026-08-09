import Alpine from "alpinejs";
import { countUp, watchNavigation } from "@/infra/client/dom/chrome";
import { notifyToggle } from "@/infra/client/dom/notify";
import { queue, watchOutbox } from "@/infra/client/dom/outbox";
import { quickAdd } from "@/infra/client/dom/quickAdd";
import { shareLink } from "@/infra/client/dom/shareLink";

declare global {
  interface Window {
    Alpine: typeof Alpine;
  }
}

Alpine.data("quickAdd", quickAdd);
Alpine.data("shareLink", shareLink);
Alpine.data("notifyToggle", notifyToggle);

window.Alpine = Alpine;
Alpine.start();

countUp();
watchNavigation();
watchOutbox();

document.body.addEventListener("htmx:sendError", (event) => {
  const form = (event as CustomEvent).target;
  if (!(form instanceof HTMLFormElement)) return;
  if (form.getAttribute("hx-post") !== "/transactions") return;

  queue(form);
  window.dispatchEvent(new CustomEvent("pebble-queued"));
});

const isLocal =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1";

if ("serviceWorker" in navigator && !isLocal) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register("/sw.js");
  });
}
