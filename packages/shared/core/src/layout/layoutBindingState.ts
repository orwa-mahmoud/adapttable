/**
 * Shared state shapes a framework binding returns from its hooks. Each
 * binding adapts core's stores to its reactivity and hands back these
 * shapes, so a kit reads the same fields in every framework.
 */
/**
 * What `useFullscreen` returns.
 *
 * @public
 */
export interface FullscreenState {
  /** Whether the table is the fullscreen element right now. */
  active: boolean;
  /** Whether the browser will allow it at all. */
  supported: boolean;
  /** Go fullscreen, or leave. */
  toggle: () => void;
  /** Leave, if it is on. */
  exit: () => void;
  /**
   * Where overlays must portal while fullscreen is on, and `undefined`
   * otherwise. Hand this to each kit's portal target — Mantine's
   * `portalProps`, MUI's `container`, antd's `getPopupContainer` — or the
   * kit's menus will render into a document nobody can see.
   */
  container: HTMLElement | undefined;
}
