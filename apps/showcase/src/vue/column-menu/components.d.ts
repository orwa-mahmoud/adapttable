/** Describe this prop-free bootstrap to TypeScript-aware linting. Vue-tsc still
 * checks the actual fixture template and the generic adapter components. */
declare module "*ColumnMenuDemo.vue" {
  import type { DefineComponent } from "vue";
  const demo: DefineComponent;
  export default demo;
}
