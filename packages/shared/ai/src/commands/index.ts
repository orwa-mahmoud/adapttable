/**
 * The built-in command registry: the only list of what a table agent can do.
 *
 * Keyed by every {@link CapabilityKey}, so a key without a definition — or
 * with two — does not compile. Catalog order is {@link CAPABILITY_KEYS}.
 */
import { CAPABILITY_KEYS, type CapabilityKey } from "../keys";
import type { AgentObservation } from "../types";
import {
  hideColumnCommand,
  pinColumnCommand,
  setColumnOrderCommand,
} from "./columnLayout";
import type { TableCommand } from "./command";
import { describeColumnsCommand, describeViewCommand } from "./describe";
import { editCellsCommand } from "./editCells";
import { setAggregationsCommand, setGroupByCommand } from "./grouping";
import { applyViewCommand, runExportCommand } from "./hostPaths";
import { setPageCommand } from "./page";
import {
  pinRowCommand,
  readRowsCommand,
  resolveRowCommand,
  setSelectionCommand,
} from "./rows";
import {
  addRowsCommand,
  deleteRowsCommand,
  reorderRowsCommand,
} from "./rowWrites";
import { setFiltersCommand, setSearchCommand } from "./searchFilters";
import { setSortCommand } from "./sort";

const COMMANDS: { readonly [K in CapabilityKey]: TableCommand<K> } = {
  "columns.describe": describeColumnsCommand,
  "view.describe": describeViewCommand,
  "view.setPage": setPageCommand,
  "view.setSort": setSortCommand,
  "view.setSearch": setSearchCommand,
  "view.setFilters": setFiltersCommand,
  "view.setGroupBy": setGroupByCommand,
  "view.setAggregations": setAggregationsCommand,
  "view.pinColumn": pinColumnCommand,
  "view.hideColumn": hideColumnCommand,
  "view.setColumnOrder": setColumnOrderCommand,
  "view.pinRow": pinRowCommand,
  "view.setSelection": setSelectionCommand,
  "views.apply": applyViewCommand,
  "rows.read": readRowsCommand,
  "rows.resolve": resolveRowCommand,
  "export.run": runExportCommand,
  "edit.cells": editCellsCommand,
  "rows.add": addRowsCommand,
  "rows.delete": deleteRowsCommand,
  "rows.reorder": reorderRowsCommand,
};

/** Every built-in command, in catalog order. */
export const TABLE_COMMANDS: readonly TableCommand[] = CAPABILITY_KEYS.map(
  (key) => COMMANDS[key]
);

/** The built-in command for a key, or `undefined` for any other string. */
export function tableCommand(key: string): TableCommand | undefined {
  return Object.hasOwn(COMMANDS, key)
    ? COMMANDS[key as CapabilityKey]
    : undefined;
}

/** Built-in keys this observation wires, in catalog order. */
export function enabledCommandKeys(
  observation: AgentObservation
): CapabilityKey[] {
  return TABLE_COMMANDS.filter((command) => command.isEnabled(observation)).map(
    (command) => command.key
  );
}
