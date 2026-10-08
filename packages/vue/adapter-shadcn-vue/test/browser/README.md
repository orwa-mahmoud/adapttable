# Filter panel browser fixture

Mount the default component from `filter-panel.fixture.ts` in the authorized
Vue showcase harness, and load the adapter's built `styles.css` once. The fixture
uses the real shadcn table, fields, Popover, Sheet, and feature contributions.

Run `filter-panel.spec.ts` against that route. Set
`SHADCN_FILTER_FIXTURE_URL` to the full fixture URL, or configure Playwright's
`baseURL` and serve the default `/vue/shadcn-vue/filter-panel/` route. The five
cases cover Popover/Sheet in both directions, nested Escape ownership, accepted
filtering, Done/Cancel focus, outside focus, feature teardown, a 375px viewport,
44px input targets, and fullscreen portaling.

The root `e2e/shadcn-vue-parity.spec.ts` imports all three package suites. The
showcase hosts them at `/vue/shadcn-vue/filter-panel/`,
`/vue/shadcn-vue/feature-parity/`, and `/vue/shadcn-vue/action-surfaces/` in the
Vite preview. They are registered as non-indexed Vue labs in the canonical
showcase manifest, so the normal Chromium PR shards discover and run them.
Browser success must be established by a real run; unit coverage is a separate
gate.

## Full optional-feature parity

`feature-parity.fixture.ts` exercises actual row-action menus, grouped rows,
aggregation, keyboard row moves, saved views, command execution, and the pivot
panel. `feature-parity.spec.ts` runs desktop English/LTR and Arabic/RTL, then
375px mobile cards. Host callbacks update the fixture's data and visible receipt.

Mount the fixture at `/vue/shadcn-vue/feature-parity/`, importing
`@adapttable/shadcn-vue/styles.css`, or set `SHADCN_PARITY_FIXTURE_URL` to its
verified URL. Use a package-scoped Vite/Playwright harness rather than replacing
these controls with mocks. Browser screenshots belong in `/tmp` or the ignored
`.playwright-mcp/` directory. The unit suites additionally exercise fullscreen
portal moves, KeepAlive, stale callbacks, rejected controlled updates, and SSR.

`action-surfaces.fixture.ts` and its spec cover assistant Sheet focus, nested
examples Escape, controlled close rejection, context and command keyboard use,
and controlled side-panel tabs in English/LTR and Arabic/RTL at 1280px and 375px.
The optional `SHADCN_ACTION_FIXTURE_URL` points to a separate authorized host.
