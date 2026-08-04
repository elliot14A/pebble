import Alpine from "alpinejs";
import { countUp, watchNavigation } from "@/infra/client/dom/chrome";
import { quickAdd } from "@/infra/client/dom/quickAdd";
import { shareLink } from "@/infra/client/dom/shareLink";

declare global {
  interface Window {
    Alpine: typeof Alpine;
  }
}

Alpine.data("quickAdd", quickAdd);
Alpine.data("shareLink", shareLink);

window.Alpine = Alpine;
Alpine.start();

countUp();
watchNavigation();

const isLocal =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1";

if ("serviceWorker" in navigator && !isLocal) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register("/sw.js");
  });
}
