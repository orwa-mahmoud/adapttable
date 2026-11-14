/**
 * The tree page, written once for React, Vue and Angular: what the hints
 * say and the table's URL namespace. The rows are the tree cast
 * (`rosterFor("tree")`), each person under the one they report to.
 */

/** The tree page's URL namespace; only the live demo writes the address bar. */
export const TREE_URL_KEY = "tree";

/** What the page tells the reader, in order. */
export const TREE_HINTS: readonly string[] = [
  "Maya Chen is the root — chevrons open a branch",
  "arrow keys walk the tree, Enter toggles",
  "moving a child under a new parent is on row-reordering",
];
