# Build an Angular data table with signals

AdaptTable combines a headless Angular binding with a kit that draws the
controls. Start with `AdaptDataTable`, an array of rows, column definitions and
a stable row key. Add feature imports when the table needs them.

## Choose a kit

- `@adapttable/angular-unstyled` uses native HTML. Supply your own CSS or
  Tailwind classes
- `@adapttable/ng-zorro` uses NG-ZORRO controls, cards and overlays
- `@adapttable/angular` supplies signals, column types and structural Chrome
  for either kit or your own renderer

The Angular binding, both kits and the optional AI binding are available on npm.
Package versions are independent; each kit declares its compatible binding and
engine dependencies. Do not force core, binding and kit to share a version.

## Install an Angular table package

Inside an existing Angular application, choose one kit. For native HTML
controls that you style yourself:

```sh
npm install @adapttable/angular-unstyled @adapttable/angular
```

For an Angular 22 application using NG-ZORRO:

```sh
npm install @adapttable/ng-zorro @adapttable/angular ng-zorro-antd@^22.1.1 @angular/cdk@^22 @angular/forms@^22 @angular/router@^22
```

Keep the host's Angular packages on compatible versions. The NG-ZORRO kit
also requires Angular Common, Core and Platform Browser 22, normally already
present in an Angular 22 application. Use Node `^22.22.3`, `^24.15.0` or
`>=26.0.0` for the Angular 22 setup. The native kit and binding also support
Angular 20 and 21; use the Node version supported by your Angular release.

For optional AI table sessions, assistants and speech bindings, add:

```sh
npm install @adapttable/ai-angular @adapttable/ai
```

The binding supports Angular 20, 21 and 22. NG-ZORRO's kit targets Angular 22
and NG-ZORRO 22.1.1, including its Angular CDK, Common, Core, Forms,
Platform Browser and Router peers. Load NG-ZORRO's theme once in the host's
global stylesheet:

```css
@import "ng-zorro-antd/ng-zorro-antd.min.css";
```

The native kit does not supply a theme stylesheet.

## Run the Angular examples from source

To explore all features together, run the repository showcase. From a clone
of this repository, use a Node version listed above for Angular 22 and the
package manager version declared in `package.json`:

```sh
pnpm install --frozen-lockfile
pnpm --filter @adapttable/showcase dev
```

Open the local address printed by Vite and navigate to `/unstyled/` for the
unstyled kit or `/ng-zorro/` for NG-ZORRO. The local showcase serves its HTML
entries directly; the published website adds the `/angular/demo/` prefix.
The source checkout resolves workspace dependencies. Use the npm commands
above when adding a table to your own application.

Try the hosted [unstyled Angular table](https://adapttable.orwamahmoud.com/angular/demo/unstyled/)
or [NG-ZORRO table](https://adapttable.orwamahmoud.com/angular/demo/ng-zorro/)
without a local install.

## A standalone table

```ts
import { Component, signal } from "@angular/core";
import { AdaptCellTemplate, type ColumnDef } from "@adapttable/angular";
import { AdaptDataTable } from "@adapttable/angular-unstyled";

interface Person {
  id: string;
  name: string;
  age: number;
}

@Component({
  selector: "people-table",
  standalone: true,
  imports: [AdaptDataTable, AdaptCellTemplate],
  template: `
    <adapt-data-table
      [data]="people()"
      [columns]="columns"
      [rowKey]="rowKey"
      tableLabel="People"
      [urlSync]="false"
    >
      <ng-template adaptCellTemplate="name" let-value="value">
        <strong>{{ value }}</strong>
      </ng-template>
    </adapt-data-table>
  `,
})
export class PeopleTable {
  readonly people = signal<Person[]>([
    { id: "ada", name: "Ada Lovelace", age: 36 },
    { id: "grace", name: "Grace Hopper", age: 85 },
  ]);
  readonly columns: ColumnDef<Person>[] = [
    { key: "name", header: "Name", sortable: true },
    { key: "age", header: "Age", sortable: true, align: "end" },
  ];
  readonly rowKey = (person: Person) => person.id;
}
```

Import `PeopleTable` into the consuming standalone component's `imports` and
render `<people-table />`. For NG-ZORRO, change only the kit import above to
`@adapttable/ng-zorro` and complete its host setup.

The frontend tier searches, sorts and pages the array. Omit the
`[urlSync]="false"` binding to keep view state in the URL. Several tables
sharing a URL need distinct
`urlKey` values. Narrow screens use cards; `forceMobile` can select that
layout explicitly.

## Add features deliberately

Import a feature from the same kit as the table, keep its configuration on
the component, and bind it through `[features]`:

```ts
import { columnMenu } from "@adapttable/angular-unstyled/column-menu";
import { multiSort } from "@adapttable/angular-unstyled/multi-sort";

const features = [columnMenu(), multiSort()];
```

`standardPreset()` from the kit's `/preset` entry is a convenient larger
composition. See [Features](./features.md) for its exact members and the
individual imports.

## Scaffold an Angular table with the CLI

From your Angular application root (the folder containing `angular.json` and
`package.json`), run:

```sh
npx @adapttable/cli@3.1.0 init
```

The CLI recognizes an Angular project when **both** `angular.json` and an
`@angular/core` dependency are present. It detects NG-ZORRO from `ng-zorro-antd`
in your dependencies; otherwise it chooses the unstyled Angular kit. Install
NG-ZORRO before running the command if that is the kit you want. There is no
`--kit` option.

It writes a standalone `PeopleTable` to `src/app/peopleTable.ts` and prints the
package installation command. Run that printed command, then import
`PeopleTable` into your host component's `imports` and render `<people-table />`.
The CLI does not mount the component or run installation for you. Existing
scaffold files are skipped; use `init --force` only when you intend to overwrite
them. The CLI's version does not need to match the table packages.

To test changes to the CLI itself, build it from this repository and invoke its
entry from your Angular application root:

```sh
# From the AdaptTable repository:
pnpm --filter @adapttable/cli build

# From your Angular application (replace the path with your checkout):
node /path/to/adapttable/packages/shared/cli/dist/cli.js init
```

## Data and callbacks

The host owns the rows. Replace the array held by `people` after a successful
write; a renderer does not become your database. For remote data, use
`[onQueryChange]` with host-owned rows, total, loading and error signals, or
pass a prebuilt source through `[source]`.

Callback inputs such as `onQueryChange` and `onRowClick` use square brackets.
Actual outputs such as `(selectionChange)` and `(columnLayoutChange)` use
parentheses. Keep callback functions stable on the component.

Continue with [Data tiers](./data-tiers.md), [Columns](./columns.md),
[Accessibility](./accessibility.md), or the
[Angular API reference](../api.md#the-angular-binding).
