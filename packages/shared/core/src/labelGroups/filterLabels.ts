/**
 * The strings the filters draw: operators, relative dates, the builder and the checklist.
 */
import type { TableLabels } from "../types";
import type { FeatureStrings } from "./tableLabels";

/**
 * The strings the filters draw: operators, relative dates, the builder and the checklist.
 *
 * @public
 */
export const FILTER_LABELS: Pick<
  Required<TableLabels>,
  | "operator"
  | "from"
  | "to"
  | "opEqual"
  | "opAtLeast"
  | "opAtMost"
  | "opBetween"
  | "opOn"
  | "opOnOrAfter"
  | "opOnOrBefore"
  | "opNotEqual"
  | "opGreater"
  | "opLess"
  | "opContains"
  | "opNotContains"
  | "opStartsWith"
  | "opEndsWith"
  | "opEmpty"
  | "opNotEmpty"
  | "opIn"
  | "opNotIn"
  | "opBefore"
  | "opAfter"
  | "opRelative"
  | "relToday"
  | "relYesterday"
  | "relTomorrow"
  | "relThisWeek"
  | "relThisMonth"
  | "relPreviousMonth"
  | "relLastN"
  | "relNextN"
  | "boolAny"
  | "boolTrue"
  | "boolFalse"
  | "removeFilter"
  | "filtersDone"
  | "filterAddCondition"
  | "filterAddGroup"
  | "filterCombinatorAnd"
  | "filterCombinatorOr"
  | "filterRemoveCondition"
  | "filterRemoveGroup"
  | "filterField"
  | "checklistSearch"
  | "checklistClear"
  | "checklistNoValues"
  | "headerFilters"
> = {
  operator: "Operator",
  from: "From",
  to: "To",
  opEqual: "Equal",
  opAtLeast: "At least",
  opAtMost: "At most",
  opBetween: "Between",
  opOn: "On",
  opOnOrAfter: "On or after",
  opOnOrBefore: "On or before",
  opNotEqual: "Not equal",
  opGreater: "Greater than",
  opLess: "Less than",
  opContains: "Contains",
  opNotContains: "Does not contain",
  opStartsWith: "Starts with",
  opEndsWith: "Ends with",
  opEmpty: "Is empty",
  opNotEmpty: "Is not empty",
  opIn: "Is any of",
  opNotIn: "Is none of",
  opBefore: "Before",
  opAfter: "After",
  opRelative: "Relative",
  relToday: "Today",
  relYesterday: "Yesterday",
  relTomorrow: "Tomorrow",
  relThisWeek: "This week",
  relThisMonth: "This month",
  relPreviousMonth: "Previous month",
  relLastN: "Last N days",
  relNextN: "Next N days",
  boolAny: "Any",
  boolTrue: "True",
  boolFalse: "False",
  removeFilter: (label) => `Remove filter: ${label}`,
  filtersDone: "Done",
  filterAddCondition: "Add condition",
  filterAddGroup: "Add group",
  filterCombinatorAnd: "AND",
  filterCombinatorOr: "OR",
  filterRemoveCondition: "Remove condition",
  filterRemoveGroup: "Remove group",
  filterField: "Field",
  checklistSearch: "Search values",
  checklistClear: "Clear",
  checklistNoValues: "No matching values",
  headerFilters: "Column filters",
};

/**
 * The strings a filter chrome draws: the base strings and the filters' own.
 *
 * @public
 */
export type FilterStrings = FeatureStrings<readonly [typeof FILTER_LABELS]>;
