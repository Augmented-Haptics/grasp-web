import { defineConfig } from "vite";

// Single-page static site. Relative base so assets resolve both at the
// app.grasp.it root domain and at the github.io/<repo>/ project-pages URL.
export default defineConfig({
  base: "./",
});
