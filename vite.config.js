import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { motionLabPlugin } from "./scripts/lib/motion-lab-plugin.mjs";
export default defineConfig({
  plugins: [react(), motionLabPlugin()],
  build: { chunkSizeWarningLimit: 1600 },
  server: {
    port: 4178,
    strictPort: true,
    fs: {
      deny: [
        ".env",
        ".env.*",
        "*.{crt,pem}",
        "**/.git/**",
        "**/.pwc/**",
        "**/.dev.vars*",
        "**/*.keys.json",
      ],
    },
  },
  preview: { port: 4178, strictPort: true },
});
