---
"@adapttable/react": minor
"@adapttable/angular": minor
"@adapttable/angular-aria": patch
"@adapttable/angular-cdk": patch
"@adapttable/angular-unstyled": patch
"@adapttable/angular-material": patch
"@adapttable/ng-bootstrap": patch
"@adapttable/ng-zorro": patch
"@adapttable/ngx-bootstrap": patch
"@adapttable/spartan": patch
"@adapttable/taiga-ui": patch
---

`@adapttable/react/pdf`, `@adapttable/react/xlsx`, `@adapttable/angular/pdf` and `@adapttable/angular/xlsx` carry `exportPdf` / `exportXlsx` and core's PDF and XLSX helpers, the same entries `@adapttable/vue` has. `exportPdf` and `exportXlsx` on `@adapttable/angular/features` are deprecated; import them from the new entries.
