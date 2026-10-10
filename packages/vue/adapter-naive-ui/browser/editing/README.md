# Naive UI editing browser contract

Mount `NaiveEditingContract.vue` using the candidate package's public exports and set `ADAPTTABLE_NAIVE_EDITING_URL` to its served URL. Run `naive-editing.spec.ts` in the existing Chromium browser CI lane. The scenarios cover RTL cell validation, numeric input, the select menu's first Escape and editing's second Escape, focus restoration, and row/batch controls in cards.

This package-only checkpoint prepares these scenarios. Local Chromium is intentionally not run; jsdom and SSR evidence are reported separately.
