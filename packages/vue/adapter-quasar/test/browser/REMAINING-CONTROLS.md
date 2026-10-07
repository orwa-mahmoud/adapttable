# Quasar remaining controls browser proof

Run the four cases through the authorized browser CI route using `test/browser/remaining-controls.playwright.config.ts`. They cover real Tab focus containment, disabled palette commands, context-menu keyboard/focus ownership, RTL side-panel tabs, and native move confirmations on desktop and mobile. Each layout case records a screenshot.

The production fixture can be built with `node --experimental-strip-types test/browser/run-remaining-controls.ts --build`. Real Chromium execution is a remaining gate; no local launch was attempted.
