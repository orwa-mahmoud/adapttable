/**
 * Build one packed Angular table and serve it, for the browser smoke test.
 *
 * The table is the unstyled kit with grouping and a summary aggregate — the
 * combination fixture — compiled and linked exactly as the budget compiles it,
 * from the packed tarballs. The page bundles the Angular framework in, because
 * a browser has nothing else to load it from. PR CI runs the smoke as the
 * `angular-consumer` Playwright project after these packages are built.
 *
 *   node scripts/build-angular-browser-consumer.mjs          # build, then serve
 *   node scripts/build-angular-browser-consumer.mjs --build  # build only
 */
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, extname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  angularTransformer,
  bundleAngularConsumer,
  compileAngularConsumers,
} from "./angular-consumer-build.mjs";
import { angularConsumerFixtures } from "./angular-consumer-fixtures.mjs";
import { fixtureFolders } from "./consumer-fixtures.mjs";
import { packedConsumer } from "./packed-consumers.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
export const ANGULAR_BROWSER_DIST = join(ROOT, "e2e/consumers/dist/angular-unstyled");
const FIXTURE = "angular · unstyled grouping + aggregation";
const PORT = Number(process.argv.find((arg) => arg.startsWith("--port="))?.slice(7) ?? 4399);

/** The compiled, linked page for the grouping fixture, as one script. */
export async function buildAngularBrowserConsumer(destination = ANGULAR_BROWSER_DIST) {
  const fixture = angularConsumerFixtures().find((entry) => entry.name === FIXTURE);
  if (!fixture) throw new Error(`Missing the ${FIXTURE} fixture`);
  const install = packedConsumer(fixtureFolders([fixture]), { peers: true });
  const transformer = angularTransformer();
  try {
    const compiled = compileAngularConsumers(install.dir, [
      { id: "page", code: fixture.code },
    ]).get("page");
    if (compiled.problems.length) {
      throw new Error(`ngc: ${compiled.problems.join("\n")}`);
    }
    const [min] = await bundleAngularConsumer(compiled.entry, {
      dir: install.dir,
      externals: [],
      transformer,
    });
    const script = min.output
      .filter((file) => file.type === "chunk")
      .map((file) => file.code)
      .join("\n");
    rmSync(destination, { recursive: true, force: true });
    mkdirSync(destination, { recursive: true });
    writeFileSync(join(destination, "main.js"), script);
    writeFileSync(join(destination, "index.html"), page());
    return destination;
  } finally {
    await transformer.close();
    install.dispose();
  }
}

/** The page: the consumer bootstraps into the body. */
function page() {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>AdaptTable Angular consumer</title>
  </head>
  <body>
    <consumer-app></consumer-app>
    <script type="module" src="./main.js"></script>
  </body>
</html>
`;
}

const TYPES = {
  "/": "text/html",
  ".html": "text/html",
  ".js": "text/javascript",
};

/** The file a request maps to, or the index for the root. */
function servedFile(destination, url) {
  return join(destination, url === "/" ? "index.html" : url);
}

/** Stop `server`, resolving once it has closed. */
function whenClosed(server) {
  return new Promise((done) => {
    server.close(() => done());
  });
}

/** Serve the built page until `close` is called. */
export function serveAngularBrowserConsumer(destination, port = PORT) {
  const server = createServer((request, response) => {
    try {
      const body = readFileSync(servedFile(destination, request.url));
      const type = TYPES[request.url] ?? TYPES[extname(request.url)] ?? "text/plain";
      response.writeHead(200, { "content-type": type });
      response.end(body);
    } catch {
      response.writeHead(404);
      response.end();
    }
  });
  return new Promise((resolve) => {
    server.listen(port, () =>
      resolve({ url: `http://127.0.0.1:${port}/`, close: () => whenClosed(server) })
    );
  });
}

const isMain =
  Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const destination = await buildAngularBrowserConsumer();
  if (!process.argv.includes("--build")) {
    const served = await serveAngularBrowserConsumer(destination);
    console.log(`Angular consumer at ${served.url}`);
  }
}
