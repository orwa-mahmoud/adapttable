/**
 * Sends every `vue` and `@vue/*` resolution to the Vue install named by
 * `ADAPTTABLE_VUE_PEER_ROOT`, for `require` as well as `import`. A UI library
 * that ships CommonJS requires Vue through Node itself, outside Vite's
 * aliases; without this it would load a second Vue runtime beside the one
 * under test.
 */
import { createRequire, registerHooks } from "node:module";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const root = process.env.ADAPTTABLE_VUE_PEER_ROOT;
if (root) {
  // Both an import and a require reach the install's CommonJS entry, so every
  // caller shares one runtime. The hook's own lookup passes straight through.
  const fromVue = createRequire(join(root, "package.json"));
  const ownedByVue = (specifier) =>
    specifier === "vue" ||
    specifier.startsWith("vue/") ||
    specifier.startsWith("@vue/");
  let resolving = false;
  registerHooks({
    resolve(specifier, context, nextResolve) {
      if (resolving || !ownedByVue(specifier))
        return nextResolve(specifier, context);
      resolving = true;
      try {
        return {
          url: pathToFileURL(fromVue.resolve(specifier)).href,
          shortCircuit: true,
        };
      } finally {
        resolving = false;
      }
    },
  });
}
