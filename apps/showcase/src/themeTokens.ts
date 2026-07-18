/** Per-adapter accent + blurb (from the design tokens) — drives the live-demo
 * switcher cards and the hero chips. The real adapter components do the actual
 * styling; these are just for the marketing chrome. */
export interface AdapterToken {
  key: string;
  label: string;
  blurb: string;
  accentLight: string;
  accentDark: string;
}

export const ADAPTER_TOKENS: AdapterToken[] = [
  {
    key: "mantine",
    label: "Mantine",
    blurb: "Rounded, friendly, filled controls",
    accentLight: "oklch(0.58 0.17 252)",
    accentDark: "oklch(0.66 0.16 252)",
  },
  {
    key: "mui",
    label: "MUI",
    blurb: "Material elevation, uppercase actions",
    accentLight: "oklch(0.55 0.18 264)",
    accentDark: "oklch(0.7 0.15 264)",
  },
  {
    key: "chakra",
    label: "Chakra",
    blurb: "Soft teal, generous radius",
    accentLight: "oklch(0.6 0.1 188)",
    accentDark: "oklch(0.72 0.1 188)",
  },
  {
    key: "antd",
    label: "Ant Design",
    blurb: "Compact, tinted header, crisp",
    accentLight: "oklch(0.56 0.2 262)",
    accentDark: "oklch(0.65 0.18 262)",
  },
  {
    key: "radix",
    label: "Radix",
    blurb: "Radix Themes, iris accent",
    accentLight: "oklch(0.54 0.19 280)",
    accentDark: "oklch(0.7 0.16 280)",
  },
  {
    key: "base-ui",
    label: "Base UI",
    blurb: "Unstyled primitives, blue accent",
    accentLight: "oklch(0.55 0.19 255)",
    accentDark: "oklch(0.7 0.15 255)",
  },
  {
    key: "shadcn",
    label: "shadcn",
    blurb: "Monochrome, ring focus",
    accentLight: "oklch(0.28 0.01 264)",
    accentDark: "oklch(0.92 0.004 264)",
  },
  {
    key: "tailwind",
    label: "Tailwind",
    blurb: "Unstyled — your own classes",
    accentLight: "oklch(0.55 0.2 277)",
    accentDark: "oklch(0.68 0.17 277)",
  },
];
