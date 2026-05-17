declare module "*.vue" {
  import type { Component } from "vue";
  const component: Component;
  export default component;
}

declare module "@lucide/vue" {
  export * from "@lucide/vue/dist/lucide-vue.suffixed";
}
