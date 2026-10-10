/** An enabled feature must never disappear because its kit paint is missing. */
export function requiredControl<T>(value: T | undefined, name: string): T {
  if (value === undefined)
    throw new Error(`AdaptTable: Vuetify requires the ${name} control.`);
  return value;
}
