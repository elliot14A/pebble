#!/usr/bin/env bun

const JS_DIR = "public/js";
const CSS_OUT = "public/css/app.css";

const bundle = await Bun.build({
  entrypoints: ["src/infra/client/dom/index.ts"],
  outdir: JS_DIR,
  naming: "client.js",
  target: "browser",
  minify: true,
});

if (!bundle.success) {
  for (const log of bundle.logs) process.stderr.write(`${log}\n`);
  process.exit(1);
}

const worker = await Bun.build({
  entrypoints: ["src/infra/client/sw/index.ts"],
  outdir: "public",
  naming: "sw.js",
  target: "browser",
  minify: true,
});

if (!worker.success) {
  for (const log of worker.logs) process.stderr.write(`${log}\n`);
  process.exit(1);
}

const htmx = await Bun.file("node_modules/htmx.org/dist/htmx.min.js").text();
await Bun.write(`${JS_DIR}/htmx.js`, htmx);

const css =
  await Bun.$`bunx @tailwindcss/cli -i styles/app.css -o ${CSS_OUT} --minify`
    .quiet()
    .nothrow();

if (css.exitCode !== 0) {
  process.stderr.write(css.stderr.toString());
  process.exit(1);
}

const clientJs = await Bun.file(`${JS_DIR}/client.js`).text();
const appCss = await Bun.file(CSS_OUT).text();
const build = Bun.hash(clientJs + appCss)
  .toString(36)
  .slice(0, 10);

const workerSource = await Bun.file("public/sw.js").text();
await Bun.write("public/sw.js", workerSource.replaceAll("__BUILD__", build));

const sizeOf = (contents: string): string =>
  `${(contents.length / 1024).toFixed(1)}kb`;

process.stdout.write(
  `client ${sizeOf(clientJs)}, css ${sizeOf(appCss)}, build ${build}\n`,
);
