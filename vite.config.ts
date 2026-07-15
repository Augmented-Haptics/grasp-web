import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const entry = (p: string) => fileURLToPath(new URL(p, import.meta.url));

// Path-based multi-page site served at app.grasp.it (root domain → base '/').
export default defineConfig({
  base: "/",
  build: {
    rollupOptions: {
      input: {
        main: entry("index.html"),
        join: entry("join/index.html"),
        download: entry("download/index.html"),
      },
    },
  },
});
