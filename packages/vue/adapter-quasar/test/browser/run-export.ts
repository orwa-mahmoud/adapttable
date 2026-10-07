import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const toolchain = createRequire(require.resolve("vitest/package.json"));
interface ViteRunner {
  build(options: { configFile: string }): Promise<unknown>;
  createServer(options: { configFile: string }): Promise<{
    listen(): Promise<unknown>;
    printUrls(): void;
  }>;
}
const vite = (await import(toolchain.resolve("vite"))) as ViteRunner;
const configFile = "test/browser/export.vite.config.ts";
if (process.argv.includes("--build")) await vite.build({ configFile });
else {
  const server = await vite.createServer({ configFile });
  await server.listen();
  server.printUrls();
}
