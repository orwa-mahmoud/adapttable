import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** Standard shadcn utility: caller classes override registry defaults. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
