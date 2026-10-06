import type { Attrs, ElementRef } from "@adapttable/vue";

export interface QuasarInputControl {
  readonly attrs: Attrs;
  readonly value: string;
  readonly label: string;
  readonly type?: "text" | "number" | "date" | "search" | "textarea";
  readonly onChange: (value: string) => void;
  readonly focusRef?: ElementRef<HTMLInputElement | HTMLTextAreaElement>;
}

export interface QuasarSelectControl {
  readonly attrs: Attrs;
  readonly value: string;
  readonly label: string;
  readonly options: readonly {
    readonly value: string;
    readonly label: string;
  }[];
  readonly onChange: (value: string) => void;
  readonly focusRef?: ElementRef<HTMLInputElement>;
}

export interface QuasarCheckboxControl {
  readonly attrs: Attrs;
  readonly checked: boolean;
  readonly indeterminate?: boolean;
  readonly label?: string;
  readonly onChange: (checked: boolean) => void;
  readonly focusRef?: ElementRef<HTMLElement>;
}
