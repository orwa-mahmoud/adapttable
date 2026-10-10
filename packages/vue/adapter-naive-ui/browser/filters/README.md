# Naive filter browser contract

The showcase lab `/vue/naive-ui/filter-panel/` mounts `NaiveFilteringContract.vue`.
This focused contract uses the common Vue workspace's order dataset, labels and
formatters.
It renders the genuine Naive adapter and its optional filter contributions.

Query options are `rtl`, `mobile`, `mode=drawer` and `dark`. The Playwright
specification covers desktop, mobile and RTL bounds, nested select dismissal,
focus restoration, the vendor drawer trap/mask/scroll lock and controlled filter
writes. It attaches a screenshot for each viewport. `e2e/vue-naive-filters.spec.ts`
runs it in the showcase browser suite.
