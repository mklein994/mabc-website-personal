/// <reference types="vitest/config" />

import { fileURLToPath } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import vue from "@vitejs/plugin-vue";
import { defineConfig, loadEnv } from "vite";

import { vitePluginGoogleFonts } from "./config/vite-plugin-google-fonts";

const resolve = (path: string) => fileURLToPath(new URL(path, import.meta.url));

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const cwd = resolve(".");
  const env = loadEnv(mode, cwd, "BUILDTIME_");

  return {
    define: {
      __VUE_OPTIONS_API__: false,
      "import.meta.vitest": "undefined",
    },

    server: {
      proxy:
        env.BUILDTIME_R2_LOCAL === "true"
          ? undefined
          : {
              "/r2": {
                target: env.BUILDTIME_ASSET_URL,
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/r2/, ""),
              },
            },
    },

    resolve: {
      alias: {
        "@": resolve("./src"),
      },
    },

    test: {
      environment: "happy-dom",
      includeSource: ["./src/**/*.ts", "./config/**/*.ts"],
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
  };
});
