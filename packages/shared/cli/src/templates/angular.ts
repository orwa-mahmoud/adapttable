import type { Kit, KitInfo } from "../detect";
import {
  columnRows,
  type FrameworkTemplate,
  peopleRows,
  personInterface,
} from "../starter";

/** A standalone component rendering the kit's `AdaptDataTable`. */
function component(info: KitInfo): string {
  return `/** Starter table scaffolded by \`npx @adapttable/cli init\` (${info.label}). */
import { Component } from "@angular/core";
import type { ColumnDef } from "@adapttable/angular";
import { AdaptDataTable } from "${info.adapter}";

${personInterface()}
@Component({
  selector: "people-table",
  standalone: true,
  imports: [AdaptDataTable],
  template: \`
    <adapt-data-table
      [data]="people"
      [columns]="columns"
      [rowKey]="rowKey"
    />
  \`,
})
export class PeopleTable {
  readonly people: Person[] = [
${peopleRows("    ")}  ];

  readonly columns: ColumnDef<Person>[] = [
${columnRows("    ", "r")}  ];

  readonly rowKey = (row: Person) => row.id;
}
`;
}

/** The styles and providers a kit needs in its host, by kit. */
const KIT_SETUP: Partial<Record<Kit, string>> = {
  "angular-aria":
    "Import @angular/cdk/overlay-prebuilt.css and @adapttable/angular-aria/styles.css. See /angular/aria/.",
  "angular-cdk":
    "Import @angular/cdk/overlay-prebuilt.css and @adapttable/angular-cdk/styles.css. See /angular/angular-cdk/.",
  "ngx-bootstrap":
    "Use zoneless Angular 22 and import @adapttable/ngx-bootstrap/styles.css. Do not load global Bootstrap CSS or JavaScript. See /angular/ngx-bootstrap/.",
  "angular-material":
    "Configure an Angular Material Sass theme and import @adapttable/angular-material/styles.css plus @angular/cdk/overlay-prebuilt.css. See /angular/material/.",
  "ng-bootstrap":
    "Import @angular/localize/init and @adapttable/ng-bootstrap/styles.css. Do not load global Bootstrap CSS or JavaScript. See /angular/ng-bootstrap/.",
  spartan:
    "Process @adapttable/spartan/styles.css through Tailwind 4 and import @angular/cdk/overlay-prebuilt.css. See /angular/spartan/.",
  "taiga-ui":
    "Register provideAdaptTaiga() from @adapttable/taiga-ui in bootstrap providers, configure Less and serve matching @taiga-ui/icons@5.26.0 src assets from assets/taiga-ui/icons. See /angular/taiga-ui/.",
  "ng-zorro":
    'NG-ZORRO requires Angular 22 and ng-zorro-antd 22.1.1-compatible peers. Match any missing Angular peers to your installed Angular version. Add @import "ng-zorro-antd/ng-zorro-antd.min.css"; to your global stylesheet.',
};

/** The Angular starter: one standalone component, imported by a host component. */
export const ANGULAR_TEMPLATE: FrameworkTemplate = {
  label: "Angular",
  bindings: ["@adapttable/angular"],
  keepsHostPeers: true,
  notice:
    "   Note: Angular kits are prepared for their first public release. Check registry availability before installing; use built local packages until your registry provides the Angular binding and kit.",
  component,
  componentPath: "src/app/peopleTable.ts",
  setupFiles: () => [],
  hostSetup: (info) => {
    const setup = KIT_SETUP[info.kit];
    return [
      '3. Import { PeopleTable } from "./peopleTable" in your host component, add PeopleTable to its imports, and render <people-table />.',
      ...(setup ? [`   ${setup}`] : []),
    ];
  },
};
