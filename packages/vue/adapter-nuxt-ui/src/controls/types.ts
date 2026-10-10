import type { Attrs, ElementRef } from "@adapttable/vue";

export interface NuxtInputControl {
  readonly value: string;
  readonly label: string;
  readonly type?:
    "text" | "number" | "date" | "search" | "datetime-local" | "time";
  readonly attrs: Attrs;
  readonly onChange: (value: string) => void;
  readonly focusRef?: ElementRef<HTMLInputElement>;
}

export interface NuxtSelectControl {
  readonly value: string;
  readonly label: string;
  readonly attrs: Attrs;
  readonly options: readonly { value: string; label: string }[];
  readonly onChange: (value: string) => void;
  readonly focusRef?: ElementRef<HTMLButtonElement>;
}
