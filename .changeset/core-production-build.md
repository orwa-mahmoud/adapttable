---
"@adapttable/core": minor
---

The package publishes a production build, with every development warning and its text compiled out, as the default export condition, and the warning build under the `development` condition that bundlers select in development (Node needs `--conditions=development`). Every plain table is about 0.8 KiB gzip smaller.
