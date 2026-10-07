# Filter panel browser fixture

Mount the default component from `filter-panel.fixture.ts` in the authorized
Vue showcase harness, and load the adapter's built `styles.css` once. The fixture
uses the real shadcn table, fields, Popover, Sheet, and feature contributions.

Run `filter-panel.spec.ts` against that route. Set
`SHADCN_FILTER_FIXTURE_URL` to the full fixture URL, or configure Playwright's
`baseURL` and serve the default `/shadcn-filter-panel-fixture/` route. The five
cases cover Popover/Sheet in both directions, nested Escape ownership, accepted
filtering, Done/Cancel focus, outside focus, feature teardown, a 375px viewport,
44px input targets, and fullscreen portaling.

These specs are source deliverables for the GitHub showcase browser harness.
They were not run locally: this task's cloud executor denies Chromium's required
local socket creation. Unit, declaration-build, and packed-runtime receipts are
reported separately; browser coverage must be established by the authorized CI
run before marking that gate passed.
