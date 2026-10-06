/** Public native-table header actions: host content beside the sort control. */
import type { ColumnDef, HeaderContext } from "@adapttable/angular";
import { AdaptDataTable } from "@adapttable/angular-unstyled";
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  InjectionToken,
  input,
  signal,
  type TemplateRef,
  viewChild,
} from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { afterEach, describe, expect, it, vi } from "vitest";

interface Person {
  id: string;
  name: string;
}

const onAction =
  vi.fn<(implicit: ColumnDef<Person>, column: ColumnDef<Person>) => void>();
const HEADER_ACTION = new InjectionToken<typeof onAction>("header action");

@Component({
  selector: "test-header-action",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<button
    type="button"
    class="component-action"
    (click)="onAction(implicit(), column())"
  >
    {{ column().header }} / {{ implicit().key }}
  </button>`,
})
class HeaderAction {
  readonly column = input.required<ColumnDef<Person>>();
  readonly implicit = input.required<ColumnDef<Person>>({
    alias: "$implicit",
  });
  readonly onAction = inject(HEADER_ACTION);
}

@Component({ selector: "test-header-note", template: `<b>Read me</b>` })
class HeaderNote {}

@Component({
  imports: [AdaptDataTable],
  providers: [{ provide: HEADER_ACTION, useValue: onAction }],
  template: `
    <ng-template #actions let-implicit let-column="column">
      @if (showAction()) {
        <button
          type="button"
          class="template-action"
          (click)="onAction(implicit, column)"
        >
          {{ column.header }} / {{ implicit.key }}
        </button>
      }
    </ng-template>
    <adapt-data-table
      [data]="rows"
      [columns]="columns()"
      [rowKey]="rowKey"
      [urlSync]="false"
      [forceMobile]="mobile()"
    />
  `,
})
class Host {
  readonly rows: Person[] = [
    { id: "bo", name: "Bo" },
    { id: "ada", name: "Ada" },
  ];
  readonly rowKey = (row: Person) => row.id;
  readonly columns = signal<ColumnDef<Person>[]>([
    { key: "name", header: "Name", sortable: true, headerActions: "info" },
  ]);
  readonly actions =
    viewChild.required<TemplateRef<HeaderContext<Person>>>("actions");
  readonly showAction = signal(true);
  readonly mobile = signal(false);
  readonly onAction = onAction;
}

async function mount() {
  const fixture = TestBed.createComponent(Host);
  document.body.append(fixture.nativeElement as HTMLElement);
  fixture.autoDetectChanges();
  await fixture.whenStable();
  return fixture;
}

const part = (name: string) =>
  document.querySelector<HTMLElement>(`[data-adapttable-part="${name}"]`);

const bodyNames = () =>
  [...document.querySelectorAll('[data-adapttable-part="cell"]')].map((cell) =>
    cell.textContent?.trim()
  );

function actionButton(selector: string) {
  const button = document.querySelector<HTMLButtonElement>(selector)!;
  expect(button).not.toBeNull();
  expect(button.closest('[data-adapttable-part="header-actions"]')).toBe(
    part("header-actions")
  );
  expect(
    button.parentElement?.closest("button, a, [role='button']")
  ).toBeNull();
  expect(part("sort-button")?.contains(button)).toBe(false);
  expect(document.querySelector("button button")).toBeNull();
  return button;
}

function expectActionContext(
  header: string,
  renderer: ColumnDef<Person>["headerActions"]
) {
  expect(onAction).toHaveBeenLastCalledWith(
    expect.objectContaining({ key: "name", header, headerActions: renderer }),
    expect.objectContaining({ key: "name", header, headerActions: renderer })
  );
  const context = onAction.mock.lastCall!;
  expect(context[0]).toBe(context[1]);
}

afterEach(() => {
  document.body.replaceChildren();
  onAction.mockClear();
});

describe("public native-table header actions", () => {
  it("preserves string content as text and omits absent or empty actions", async () => {
    const fixture = await mount();
    const host = fixture.componentInstance;
    expect(part("header-actions")?.textContent?.trim()).toBe("info");
    host.columns.update(([column]) => [
      { ...column!, headerActions: "<button>text</button>" },
    ]);
    await fixture.whenStable();
    expect(part("header-actions")?.textContent?.trim()).toBe(
      "<button>text</button>"
    );
    expect(part("header-actions")?.querySelector("button")).toBeNull();
    for (const headerActions of ["", undefined]) {
      host.columns.update(([column]) => [{ ...column!, headerActions }]);
      await fixture.whenStable();
      expect(part("header-actions")).toBeNull();
    }
  });

  it("runs template callbacks with the current context without sorting", async () => {
    const fixture = await mount();
    const host = fixture.componentInstance;
    host.columns.update(([column]) => [
      { ...column!, headerActions: host.actions() },
    ]);
    await fixture.whenStable();
    expect(bodyNames()).toEqual(["Bo", "Ada"]);
    const firstButton = actionButton(".template-action");
    expect(firstButton.textContent?.trim()).toBe("Name / name");
    firstButton.click();
    await fixture.whenStable();
    expect(onAction).toHaveBeenCalledTimes(1);
    expectActionContext("Name", host.actions());
    expect(bodyNames()).toEqual(["Bo", "Ada"]);

    host.columns.update(([column]) => [{ ...column!, header: "Person" }]);
    await fixture.whenStable();
    const updatedButton = actionButton(".template-action");
    expect(updatedButton.textContent?.trim()).toBe("Person / name");
    updatedButton.click();
    expect(onAction).toHaveBeenCalledTimes(2);
    expectActionContext("Person", host.actions());

    host.showAction.set(false);
    await fixture.whenStable();
    expect(document.querySelector(".template-action")).toBeNull();
    host.showAction.set(true);
    await fixture.whenStable();
    actionButton(".template-action").click();
    expectActionContext("Person", host.actions());
    part("sort-button")!.click();
    await fixture.whenStable();
    expect(bodyNames()).toEqual(["Ada", "Bo"]);
    expect(onAction).toHaveBeenCalledTimes(3);
  });

  it("passes declared component inputs and callbacks the changed column", async () => {
    const fixture = await mount();
    const host = fixture.componentInstance;
    host.columns.update(([column]) => [
      { ...column!, headerActions: HeaderAction },
    ]);
    await fixture.whenStable();
    actionButton(".component-action").click();
    await fixture.whenStable();
    expect(onAction).toHaveBeenCalledTimes(1);
    expectActionContext("Name", HeaderAction);
    expect(bodyNames()).toEqual(["Bo", "Ada"]);

    host.columns.update(([column]) => [{ ...column!, header: "People" }]);
    await fixture.whenStable();
    const button = actionButton(".component-action");
    expect(button.textContent?.trim()).toBe("People / name");
    button.click();
    expect(onAction).toHaveBeenCalledTimes(2);
    expectActionContext("People", HeaderAction);
  });

  it("replaces renderer kinds and removes components when actions disappear", async () => {
    const fixture = await mount();
    const host = fixture.componentInstance;
    const cases = [
      { renderer: HeaderNote, text: "Read me" },
      { renderer: host.actions(), text: "Name / name" },
      { renderer: "again", text: "again" },
    ];
    for (const { renderer, text } of cases) {
      host.columns.update(([column]) => [
        { ...column!, headerActions: renderer },
      ]);
      await fixture.whenStable();
      expect(part("header-actions")?.textContent?.trim()).toBe(text);
    }
    expect(document.querySelector("test-header-note")).toBeNull();
    expect(document.querySelector(".template-action")).toBeNull();
    host.columns.update(([column]) => [
      { ...column!, headerActions: undefined },
    ]);
    await fixture.whenStable();
    expect(part("header-actions")).toBeNull();
  });

  it("removes actions with hidden columns and restores their latest context", async () => {
    const fixture = await mount();
    const host = fixture.componentInstance;
    host.columns.update(([column]) => [
      { ...column!, headerActions: HeaderAction, hideOnDesktop: true },
    ]);
    await fixture.whenStable();
    expect(part("header-actions")).toBeNull();
    host.columns.update(([column]) => [
      { ...column!, header: "Visible again", hideOnDesktop: false },
    ]);
    await fixture.whenStable();
    actionButton(".component-action").click();
    expectActionContext("Visible again", HeaderAction);
  });

  it("keeps header actions on the desktop header rather than mobile cards", async () => {
    const fixture = await mount();
    fixture.componentInstance.mobile.set(true);
    await fixture.whenStable();
    expect(part("card")).not.toBeNull();
    expect(part("header-actions")).toBeNull();
  });
});
