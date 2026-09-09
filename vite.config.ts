import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? "/official-site/" : "/",
  plugins: [react()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          three: ["three", "@react-three/fiber", "@react-three/drei"],
        },
      },
    },
  },
});
