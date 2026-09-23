import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  build: { chunkSizeWarningLimit: 1600 },
  server: { port: 4178, strictPort: true },
  preview: { port: 4178, strictPort: true },
});
