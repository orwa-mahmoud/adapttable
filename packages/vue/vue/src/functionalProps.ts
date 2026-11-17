/**
 * Functional components with their declared props.
 */

/**
 * A functional component with its declared props attached.
 *
 * A call rather than a `Component.props = [...]` statement, so a bundle that
 * never draws the component drops it and everything it imports.
 *
 * @param component - The render function.
 * @param props - The props Vue passes it.
 * @param options - Other component options, such as `inheritAttrs`.
 * @returns The same function, carrying `props` and the options.
 *
 * @public
 */
export function withProps<TComponent extends object, TProps>(
  component: TComponent,
  props: TProps
): TComponent & { props: TProps };
export function withProps<
  TComponent extends object,
  TProps,
  TOptions extends { readonly inheritAttrs?: boolean },
>(
  component: TComponent,
  props: TProps,
  options: TOptions
): TComponent & { props: TProps } & TOptions;
/* @__NO_SIDE_EFFECTS__ */
export function withProps(
  component: object,
  props: unknown,
  options?: { readonly inheritAttrs?: boolean }
): object {
  return Object.assign(component, { props }, options);
}
