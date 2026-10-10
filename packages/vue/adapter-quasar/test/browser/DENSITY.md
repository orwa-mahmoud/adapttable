# Native Quasar density acceptance

From the Quasar package, run `node --experimental-strip-types test/browser/run-density.ts`
and open `/test/browser/density.html`. Query options are `mobile=1`, `dir=rtl`,
and `dark=1`. The fixture loads the matching official Quasar direction stylesheet.

Run `playwright test --config test/browser/density.playwright.config.ts` in
the authorized browser CI environment. The eight cases cover desktop/mobile,
LTR/RTL, light/dark, visible Comfortable/Compact buttons, Tab order, Enter/Space,
rejected and accepted controlled writes, preserved focus, 44px targets, viewport
containment, and the unchanged pagination combobox. Screenshots are retained
with the browser outputs for visual review.

The fixture can be built with `node --experimental-strip-types test/browser/run-density.ts --build`.
Source and packaged jsdom tests do not constitute real-browser acceptance.
