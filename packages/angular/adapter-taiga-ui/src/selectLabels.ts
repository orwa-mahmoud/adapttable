import { Pipe, type PipeTransform } from "@angular/core";

/** Keeps selected labels localized while option values stay unchanged. */
@Pipe({ name: "taigaLabels", standalone: true, pure: true })
export class AdaptTaigaLabels implements PipeTransform {
  transform(
    options: readonly unknown[] | Readonly<Record<string, unknown>>,
    labels?: Readonly<Record<string, unknown>>
  ): (value: unknown) => string {
    return (value: unknown): string => {
      if (Array.isArray(options)) {
        const item = options.find((option: unknown) => {
          if (typeof option !== "object" || option === null)
            return option === value;
          const record = option as Record<string, unknown>;
          return (record.value ?? record.key) === value;
        });
        if (typeof item === "object" && item !== null && "label" in item)
          return String(item.label);
        return String(value ?? "");
      }
      const mapped = (options as Readonly<Record<string, unknown>>)[
        String(value)
      ];
      return String((labels ? labels[String(mapped)] : mapped) ?? value ?? "");
    };
  }
}
