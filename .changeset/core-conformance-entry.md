---
"@adapttable/core": minor
---

New entry: `@adapttable/core/conformance` — the conformance suite every built-in adapter passes. It exports `tableConformanceTests`, the driver and harness types it runs with, and the scenario data, so an adapter or binding built outside the repository runs the same assertions. The entry imports no test runner and no framework.
