/**
 * Neutral feature registration. React providers and slot renders live on
 * {@link TableFeature} in the binding, not here.
 */

/**
 * Live engine a neutral plugin may register against.
 *
 * @public
 */
export interface NeutralFeatureHost<TRow = unknown> {
  /** Forget a registration when the table is disposed or features change. */
  onDispose(cleanup: () => void): void;
  /**
   * Phantom marker that pins the row type; never read at runtime.
   */
  readonly __row?: (row: TRow) => void;
}

/**
 * Neutral plugin: id, operators, cleanup. No React configuration bags.
 *
 * @public
 */
export interface FeatureRegistration<TRow = unknown> {
  /** Stable id (`"row-reorder"`, `"grouping"`, a host plugin's name). */
  readonly id: string;
  /**
   * Phantom so a registration can name its row type without a React host.
   */
  readonly __row?: (row: TRow) => void;
}
