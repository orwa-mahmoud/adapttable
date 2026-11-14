/**
 * What the filtering page's Filters panel holds, written once for React, Vue
 * and Angular: the per-field form, the AND/OR tree, or both.
 */

/** What the Filters panel holds. */
export type FilterForm = "fields" | "advanced" | "both";

/** The choices, in the order the page offers them. */
export const FILTER_FORMS: readonly { value: FilterForm; label: string }[] = [
  { value: "fields", label: "Fields" },
  { value: "advanced", label: "Advanced" },
  { value: "both", label: "Both" },
];

/** The per-field form shows unless the panel holds only the tree. */
export const formShowsFields = (form: FilterForm): boolean =>
  form !== "advanced";

/** The AND/OR tree shows unless the panel holds only the fields. */
export const formShowsTree = (form: FilterForm): boolean => form !== "fields";

/**
 * Header funnels are per-field filters, so the header layout draws them
 * only while the form keeps its fields.
 *
 * @param headerLayout - Whether the page lays its filters out in the header.
 * @param form - What the panel holds.
 * @returns Whether the header funnels show.
 */
export const formShowsHeaderFunnels = (
  headerLayout: boolean,
  form: FilterForm
): boolean => headerLayout && formShowsFields(form);
