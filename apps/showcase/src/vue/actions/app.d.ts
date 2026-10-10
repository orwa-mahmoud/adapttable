/** The bootstrap consumes this prop-free app; vue-tsc also checks its concrete SFC. */
declare module "*ActionControlsDemo.vue" {
  import type { DefineComponent } from "vue";
  const component: DefineComponent;
  export default component;
}
