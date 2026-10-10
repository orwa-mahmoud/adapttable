/**
 * An attribute record: attribute values, an optional `style` object, event
 * handlers (`onClick`, `onChange`, `onKeyDown`, `onFocus` and the mouse
 * presses) and an optional `ref` that receives the element.
 *
 * @public
 */
export type Attrs = Readonly<Record<string, unknown>>;
