/** Only a direct, plain CSS target is a stylesheet rather than a typed entry. */
export function isVueCssExport(target) {
  return typeof target === "string" && /^\.\/[^?#]*\.css$/.test(target);
}
