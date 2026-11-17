/**
 * A function that receives a row, compared bivariantly in its parameters —
 * the rule TypeScript applies to methods. A column or a state object typed
 * over `Person` stays assignable where a slot erases the row to `unknown`,
 * while every call site still checks its arguments against `TArgs`.
 *
 * Where rows also arrive as data, a contract writes the row parameter as
 * `NoInfer<TRow>`, so the row type comes from the rows, never from a
 * callback's annotation. Where a callback is all there is (a row action),
 * the row type is inferred from it.
 *
 * @typeParam TArgs - The parameters, a row among them.
 * @typeParam TResult - What the function returns.
 *
 * @public
 */
export type RowCallback<TArgs extends readonly unknown[], TResult> = {
  bivarianceHack(...args: TArgs): TResult;
}["bivarianceHack"];
