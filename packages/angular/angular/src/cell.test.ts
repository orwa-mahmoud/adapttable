import { Component, input, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";

import { AdaptCell, AdaptHeader } from "./cell";
import type { ColumnDef } from "./columnDef";

interface Row {
  id: string;
  name: string;
}

@Component({
  selector: "name-badge",
  template: `{{ row().name }}#{{ rowIndex() }}`,
})
class NameBadge {
  readonly row = input.required<Row>();
  readonly rowIndex = input(0);
}

@Component({
  selector: "header-badge",
  template: `[{{ column().key }}]`,
})
class HeaderBadge {
  readonly column = input.required<ColumnDef<Row>>();
}

@Component({ selector: "no-inputs", template: `plain` })
class NoInputs {}

@Component({
  imports: [AdaptCell, AdaptHeader],
  template: `<table>
    <tr>
      <th [adaptHeader]="column()"></th>
      <td
        [adaptCell]="column()"
        [adaptCellRow]="row()"
        [adaptCellIndex]="4"
      ></td>
    </tr>
  </table>`,
})
class Host {
  readonly column = signal<ColumnDef<Row>>({ key: "name" });
  readonly row = signal<Row>({ id: "1", name: "Ada" });
}

async function mount(column: ColumnDef<Row>, row?: Row) {
  const fixture = TestBed.createComponent(Host);
  fixture.componentInstance.column.set(column);
  if (row) fixture.componentInstance.row.set(row);
  await fixture.whenStable();
  const element = fixture.nativeElement as HTMLElement;
  return {
    cell: () => element.querySelector("td")?.textContent?.trim(),
    header: () => element.querySelector("th")?.textContent?.trim(),
  };
}

describe("cell and header content", () => {
  it("shows the accessor value and the header text", async () => {
    const { cell, header } = await mount({
      key: "name",
      header: "Name",
      accessor: (row) => row.name,
    });
    expect(cell()).toBe("Ada");
    expect(header()).toBe("Name");
  });

  it("shows nothing for a missing value or header", async () => {
    const { cell, header } = await mount({ key: "name", accessor: () => null });
    expect(cell()).toBe("");
    expect(header()).toBe("");
  });

  it("reads a column without an accessor as core does: its plain text, then its key", async () => {
    const formatted = await mount({
      key: "summary",
      formatValue: (row) => `${row.name} (collapsed)`,
    });
    expect(formatted.cell()).toBe("Ada (collapsed)");
    const byKey = await mount({ key: "name" });
    expect(byKey.cell()).toBe("Ada");
  });

  it("renders a component with only the inputs it declares", async () => {
    const { cell, header } = await mount({
      key: "name",
      cell: NameBadge,
      headerCell: HeaderBadge,
    });
    expect(cell()).toBe("Ada#4");
    expect(header()).toBe("[name]");
  });

  it("renders a component that declares no inputs", async () => {
    const { cell } = await mount({ key: "name", cell: NoInputs });
    expect(cell()).toBe("plain");
  });
});
