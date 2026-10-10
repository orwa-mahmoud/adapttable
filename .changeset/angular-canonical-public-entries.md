---
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
"@adapttable/ai-angular": patch
---

Organize the Angular 0.5 binding around canonical public entries: application
hooks, column/rendering contracts, composition and `AdaptCellTemplate` at the
root; headless factories/options under `/features`; structural Chrome, kit models,
directives and controllers under `/adapter`. Specialized formula, pivot, router,
sparkline and stream entries retain their declaration and DI-token identities.

All nine native kits and Angular AI consume those entries; kit feature imports
remain unchanged. Custom renderers/adapters must update binding imports using
the migration guide. Each entry re-exports the public types its signatures return.
