---
"@adapttable/angular": patch
"@adapttable/ng-bootstrap": patch
---

ng-bootstrap tables follow `NgbConfig.animation`. Setting it to `false` turns the table's animation and overlay motion off, the same way the operating-system preference does. The default `true` leaves that preference in charge. ng-bootstrap has no app-wide direction, locale, or size setting.
