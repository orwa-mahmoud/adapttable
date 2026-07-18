import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Minimal Vite config so this starter boots on StackBlitz and locally.
export default defineConfig({
  plugins: [react()],
});
