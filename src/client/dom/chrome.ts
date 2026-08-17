import { displayMoney } from "@/core/money";

const COUNT_MS = 620;

const easeOut = (t: number): number => 1 - (1 - t) ** 3;

const still = (): boolean =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export const countUp = (): void => {
  if (still()) return;

  for (const element of document.querySelectorAll<HTMLElement>(
    "[data-count]",
  )) {
    const target = Number(element.dataset.count ?? "0");
    const currency = element.dataset.currency ?? "INR";
    if (!Number.isFinite(target) || target === 0) continue;

    const started = performance.now();
    const step = (frame: number): void => {
      const progress = Math.min(1, (frame - started) / COUNT_MS);
      const value = Math.round(target * easeOut(progress));
      element.textContent = displayMoney({ minor: value, currency });
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
};

export const watchNavigation = (): void => {
  const bar = document.getElementById("progress");
  if (bar === null) return;

  const start = (): void => {
    bar.classList.remove("done");
    bar.classList.add("on");
  };

  const finish = (): void => {
    bar.classList.add("done");
    bar.classList.remove("on");
  };

  document.addEventListener("click", (event) => {
    const link = (event.target as Element | null)?.closest("a");
    if (link === null || link === undefined) return;
    if (link.target === "_blank" || link.hasAttribute("download")) return;
    if (link.origin !== window.location.origin) return;
    if (link.getAttribute("href")?.startsWith("#")) return;
    start();
  });

  for (const form of document.querySelectorAll("form[method='post']")) {
    form.addEventListener("submit", start);
  }

  window.addEventListener("pageshow", () => {
    bar.classList.remove("on", "done");
  });

  document.body.addEventListener("htmx:beforeRequest", start);
  document.body.addEventListener("htmx:afterRequest", finish);
};
