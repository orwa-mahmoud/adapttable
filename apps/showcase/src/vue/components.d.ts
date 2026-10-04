/**
 * TypeScript-aware linting does not compile SFC imports. Describe this
 * prop-free bootstrap component; vue-tsc still checks its actual template
 * and the generic adapter components without a wildcard SFC fallback.
 */
declare module "*NativeDemo.vue" {
  import type { DefineComponent } from "vue";
  const demo: DefineComponent;
  export default demo;
}
