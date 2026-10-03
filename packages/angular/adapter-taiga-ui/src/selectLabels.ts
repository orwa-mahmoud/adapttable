import { Pipe, type PipeTransform } from "@angular/core";

/** Visible labels and primitive values have meaningful text; objects do not. */
function labelText(value: unknown): string {
  switch (typeof value) {
    case "string":
    case "number":
    case "boolean":
    case "bigint":
    case "symbol":
      return String(value);
    default:
      return "";
  }
}

/** Keeps selected labels localized while option values stay unchanged. */
@Pipe({ name: "taigaLabels", standalone: true, pure: true })
export class AdaptTaigaLabels implements PipeTransform {
  transform(
    options: readonly unknown[] | Readonly<Record<string, unknown>>,
    labels?: Readonly<Record<string, unknown>>
  ): (value: unknown) => string {
    return (value: unknown): string => {
      if (Array.isArray(options)) {
        const item: unknown = options.find((option: unknown) => {
          if (typeof option !== "object" || option === null)
            return option === value;
          const record = option as Record<string, unknown>;
          return (record.value ?? record.key) === value;
        });
        if (typeof item === "object" && item !== null && "label" in item)
          return labelText(item.label);
        return labelText(labels?.[labelText(value)] ?? value);
      }
      const mapped = (options as Readonly<Record<string, unknown>>)[
        labelText(value)
      ];
      return labelText((labels ? labels[labelText(mapped)] : mapped) ?? value);
    };
  }
}
