# Naive remaining-control browser contract

Mount `NaiveRemainingContract.vue` through the built candidate package exports,
then set `ADAPTTABLE_NAIVE_REMAINING_URL` and run `naive-remaining.spec.ts` in the
existing browser CI lane. The suite checks actual keyboard focus, prefix
matching, repeated-key cycling, native Tab/Shift+Tab traversal relative to the
opener, native command activation, fullscreen containment, saved views,
aggregation filtering, grouped-row Cancel/Move focus and host-controlled tabs.
KeepAlive tests retire open popups before reactivation.

These are prepared scenarios. Local Chromium is not run in this checkpoint;
source/Node checks and actual browser evidence must be reported separately.
