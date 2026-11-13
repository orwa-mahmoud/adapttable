---
"@adapttable/core": minor
"@adapttable/react": patch
"@adapttable/angular": minor
"@adapttable/vue": patch
"@adapttable/antd": patch
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

The "no results" view's "Clear all" clears the search as well as the filters, so a search that matched nothing no longer leaves the table empty. New: `clearSearchAndFilters` in `@adapttable/core/binding`, and on the React table chrome and the Angular table.
