# Packed Vue native filter consumer

This is a browser test fixture, not another demo app. The public showcase
continues to resolve library JavaScript from source. These tests instead prove
the JavaScript exports and explicitly imported stylesheet that a consumer gets
from the package tarballs.

After the normal package build, `pnpm build:e2e:vue-consumer` packs core, the Vue
binding, the native adapter and i18n with `pnpm pack`. It installs those tarballs
in a temporary directory, typechecks this fixture against their declarations,
and builds it with Vite without the showcase config or aliases. Vue, Vite,
TypeScript and virtual-core use the exact versions installed in the workspace.
The bundle guard rejects workspace library modules and a missing package CSS
import.

Only compiled assets and the tarball/version receipt survive under ignored
`e2e/consumers/dist/vue-native-filters/`. The existing showcase test server
mounts that artifact at `/__consumers/vue-native-filters/`; nothing is placed in
the public showcase distribution or sitemap. Local Playwright startup builds
it after the showcase. CI restores `packed-vue-consumer-dist` beside the
showcase and docs artifacts, and a missing consumer artifact fails startup.

`e2e/vue-packed-filter-surfaces.spec.ts` runs in the existing Chromium project.
Its six cases cover desktop and mobile Arabic RTL drawers, native modal top
layer and focus, the sole real scrim, foreground containment and paint, pointer
drag origin, class overrides, unrelated dialogs, and compact keyboard controls.
RTL uses the actual Arabic locale preset. Drawer screenshots are attached to
the browser report for both sizes. Existing source-based showcase and native
fullscreen tests remain separate coverage.
