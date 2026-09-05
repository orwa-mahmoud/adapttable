/**
 * Framework-neutral inline style bag. Structurally compatible with
 * React CSSProperties without importing React.
 *
 * @public
 */
export type CssProperties = {
  [key: string]: string | number | undefined;
};
