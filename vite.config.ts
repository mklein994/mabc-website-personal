import { fileURLToPath } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";

import { vitePluginGoogleFonts } from "./config/vite-plugin-google-fonts";

const resolve = (path: string) => fileURLToPath(new URL(path, import.meta.url));

// https://vite.dev/config/
export default defineConfig({
  define: {
    __VUE_OPTIONS_API__: false,
  },

  resolve: {
    alias: {
      "@": resolve("./src"),
    },
  },

  plugins: [
    vue(),
    tailwindcss(),
    vitePluginGoogleFonts({
      fonts: [
        {
          family: "DM Sans",
          specs: [0, 1].map((ital) => ({
            ital,
            opsz: "9..40",
            wght: "100..1000",
          })),
        },

        {
          family: "Merriweather",
          specs: [0, 1].map((ital) => ({
            ital,
            opsz: "18..144",
            wght: "300..900",
          })),
        },
      ],

      display: "swap",
    }),
  ],
});
