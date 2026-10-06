# @adapttable/quasar

Quasar controls for AdaptTable's headless Vue binding. The Vue binding owns
state and feature behavior; Quasar supplies the interactive components.

## Application setup

The adapter requires Vue 3 and Quasar 2. Register the Quasar plugin once and
load its stylesheet in your application entry:

```ts
import { createApp } from "vue";
import { Quasar } from "quasar";
import "quasar/dist/quasar.css";

createApp(App).use(Quasar, { config: {} }).mount("#app");
```

For a plain Vue/Vite application, use Quasar's official Vite plugin and asset
transform configuration. The v2 plugin requires Vite 8, `@vitejs/plugin-vue` 6,
and Quasar 2.24 or newer:

```ts
import { quasar, transformAssetUrls } from "@quasar/vite-plugin";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [vue({ template: { transformAssetUrls } }), quasar()],
});
```

The same plugin configuration is needed for browser-like Vitest tests so
Quasar resolves its client build. Install Quasar into the test application;
components are not stubbed.

For production SSR/SSG, use **Quasar CLI with Vite**. Quasar explicitly does
not support SSR/SSG through its standalone Vite plugin. Component-level Node
SSR and hydration tests do not establish support for that unsupported build
mode. In a Quasar CLI application, let the CLI install Quasar and manage its
server context; do not install a second application instance.

## Control targets

The attribute contract follows the actual supported targets of each kit
component. Compound fields may have a separate presentation host.

- `QInput`: semantic attributes and both class hooks reach the native input
  or textarea. Styles use Quasar's public `inputStyle`; refs use `nativeEl`.
- `QSelect`: semantic attributes reach its actual native `input[role=combobox]`.
  Classes and presentation styles reach the Quasar field's label host. The
  focus ref resolves the native input through `HTMLLabelElement.control`,
  using Quasar's public `for` association. It never queries vendor classes.
- `QCheckbox`: attributes, styles, classes and refs reach Quasar's genuine
  keyboard-focusable `div[role=checkbox]`, including mixed-state ARIA. Its
  nested native form input is not the interactive contract target.
- `QBtn`: attributes, styles, classes and refs reach the native button.

Ref callbacks receive the actual target and `null` when their owner changes,
the native target changes, or the wrapper is disposed. Controlled model
requests use Quasar's public props/events; a rejected request is repainted
without replacing the focused element or mutating private DOM.

Quasar owns select keyboard interactions and its responsive menu/dialog
behavior. Direction and keyboard attributes are preserved. The application
should configure its Quasar language pack and RTL stylesheet as documented
by Quasar, alongside AdaptTable's localized labels.

## Upstream references

- [Quasar Vite integration](https://quasar.dev/start/vite-plugin/)
- [Quasar CLI SSR configuration](https://quasar.dev/quasar-cli-vite/developing-ssr/configuring-ssr/)
- [QInput](https://quasar.dev/vue-components/input/)
- [QSelect](https://quasar.dev/vue-components/select/)
- [QCheckbox](https://quasar.dev/vue-components/checkbox/)
- [Quasar RTL support](https://quasar.dev/options/rtl-support/)
- [Quasar MIT license](https://github.com/quasarframework/quasar/blob/dev/LICENSE)

Quasar is MIT licensed. The controls are tested against Quasar 2.34.0.

## Control verification

Run the client suite with `vitest run --config vitest.config.ts`. Run the
server suite separately with `ADAPTTABLE_QUASAR_SSR=1 vitest run --config
vitest.config.ts`; this deliberately resolves Quasar's server build and
supplies the actual SSR request context without browser globals.

The server suite checks `test/server-controls.html` against a fresh server
render. The client suite hydrates that same output, checks native-element
identity and warnings, and exercises a rejected controlled edit afterward.
After an intentional vendor markup update, regenerate the fixture with
`ADAPTTABLE_UPDATE_SSR_FIXTURE=1` on the server command and rerun both suites.
These low-level tests do not replace Quasar CLI SSR application verification.
