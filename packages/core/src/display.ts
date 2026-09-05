/**
 * What a binding may put in a cell, a header, or a slot.
 *
 * Deliberately unstructured on the object side: a React element, a portal and
 * a list of them are all display values, and the engine never looks inside
 * one — it hands it back to the binding that made it, and stringifies it only
 * when it is already a primitive. `symbol` is the one thing left out, because
 * nothing renders one.
 *
 * @public
 */
export type DisplayValue = string | number | boolean | bigint | object | null;
