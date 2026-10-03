# ng-bootstrap Angular data table

`@adapttable/ng-bootstrap` is a private workspace preview. It uses the Angular
binding's signals, feature factories and Chrome with ng-bootstrap overlays and
Bootstrap controls. Publication and final integrated browser acceptance are
separate from this implementation.

## Dependencies

Use Angular 22, ng-bootstrap 21, Bootstrap CSS 5.3.8 and Popper 2.11.8, matching
[the official compatibility table](https://github.com/ng-bootstrap/ng-bootstrap#dependencies).
ng-bootstrap also requires `@angular/forms`, `@angular/localize` and RxJS.
The kit is private `0.0.0`; use its workspace dependency until a public release is
explicitly prepared. Do not substitute a React Bootstrap package.

## Render the table

```ts
import "@angular/localize/init";
import { Component } from "@angular/core";
import { type ColumnDef } from "@adapttable/angular";
import { AdaptDataTable } from "@adapttable/ng-bootstrap";
import { filters } from "@adapttable/ng-bootstrap/filters";

interface Person {
  id: string;
  name: string;
}

@Component({
  selector: "people-table",
  imports: [AdaptDataTable],
  template: `<adapt-data-table
    [data]="people"
    [columns]="columns"
    [rowKey]="rowKey"
    [features]="features"
    theme="dark"
    dir="rtl"
    tableLabel="People"
  />`,
})
export class PeopleTable {
  readonly people = [{ id: "1", name: "Ada" }];
  readonly rowKey = (row: Person) => row.id;
  readonly columns: ColumnDef<Person>[] = [
    {
      key: "name",
      header: "Name",
      accessor: (row) => row.name,
      sortable: true,
    },
  ];
  readonly features = [filters<Person>([{ key: "name", type: "text" }])];
}
```

Use the same optional Angular features and callbacks as the other Angular kits,
imported from `@adapttable/ng-bootstrap/<feature>`. The host still owns every data
write. Mobile cards, density, direction, labels and part/class hooks retain the
binding's contracts.

## Isolated Bootstrap styles

Load this kit's stylesheet once through the application's global CSS pipeline:

```css
@import "@adapttable/ng-bootstrap/styles.css";
```

Its upstream Bootstrap rules are compiled with every selector bounded by
`.adapttable-ng-bootstrap`, including Reboot, color-mode variables and overlays.
Animation names are namespaced. The Bootstrap MIT attribution ships alongside
the stylesheet. Do not import global Bootstrap CSS, RTL CSS or Bootstrap JS into
a mixed-kit application.

The table host adds that boundary automatically. `theme="light"` and
`theme="dark"` set its Bootstrap color mode. Standalone exported controls and
assistant components need a wrapper with the same class and a `data-bs-theme`
attribute. Native overlays stay inside the boundary, so loading this kit does not
reset the shared navigation or another kit's controls.

## Component mapping

- Text, number and date inputs: Bootstrap `form-control`
- Selects and checkboxes: Bootstrap `form-select` and `form-check-input`
- Buttons and table: Bootstrap `btn` and `table`
- Filter popover: `NgbPopover`, outside/Escape dismissal, no backdrop
- Drawer: `NgbOffcanvas`, real backdrop and focus containment
- Column, saved-view, header, row and context menus: `NgbDropdown`
- Command palette and assistant sheet: `NgbModal`
- Paging and advanced disclosure: `NgbPagination` and `NgbCollapse`

ng-bootstrap intentionally uses Bootstrap CSS for controls it does not expose as
Angular widgets. No controls are borrowed from another AdaptTable kit.

## Validation status

The kit includes conformance, feature and native-control regression tests plus a
selector-by-selector stylesheet isolation test. Final integration must verify
all package gates and browser interactions, including kit switching, fixed and
sticky cells, narrow cards, both themes, RTL, Escape, focus restoration and
repeated overlay opens. Those integrated checks are required before describing
the preview as ready for public release.
