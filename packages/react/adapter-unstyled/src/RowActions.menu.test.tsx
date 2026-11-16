import { act, fireEvent } from "@testing-library/react";
import { expect, it } from "vitest";

import { rowActionsMenuTests } from "../../react/test/kit/suites/rowActionsMenu";
import { kit } from "./data-table.test-utils";

for (const test of rowActionsMenuTests(kit)) it(test.name, test.run);

it("closes the native row actions menu on Escape and returns focus to its trigger", () => {
  const { DataTable, render } = kit;
  render(
    <DataTable
      data={[{ id: "1", name: "Ada" }]}
      columns={[{ key: "name", header: "Name" }]}
      rowKey={(row: { id: string }) => row.id}
      urlSync={false}
      rowActionsLayout="menu"
      rowActions={[{ key: "edit", label: "Edit", onClick: () => undefined }]}
    />
  );
  const menu = document.querySelector<HTMLDetailsElement>(
    '[data-adapttable-part="row-actions-menu"]'
  )!;
  const trigger = menu.querySelector("summary")!;
  act(() => {
    menu.open = true;
    fireEvent(menu, new Event("toggle"));
  });
  menu.querySelector("button")!.focus();
  fireEvent.keyDown(menu.querySelector("button")!, { key: "Escape" });
  expect(menu.open).toBe(false);
  expect(document.activeElement).toBe(trigger);
  fireEvent.keyDown(menu, { key: "Escape" });
  expect(menu.open).toBe(false);
});
