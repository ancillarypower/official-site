import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import { buildConnectSrc, injectConnectSrc } from "./src/lib/csp";

/** Inject the connect-src allowlist into index.html's CSP (Issue #583). */
function cspConnectSrc(connectSrc: string): Plugin {
  return {
    name: "csp-connect-src",
    transformIndexHtml: {
      order: "pre",
      handler: (html) => injectConnectSrc(html, connectSrc),
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  return {
    base: process.env.GITHUB_ACTIONS ? "/official-site/" : "/",
    plugins: [react(), cspConnectSrc(buildConnectSrc(env))],
    resolve: {
      alias: {
        "@": resolve(__dirname, "src"),
      },
    },
    worker: {
      format: "es",
    },
    build: {
      modulePreload: { polyfill: false },
      rollupOptions: {
        output: {
          manualChunks: {
            three: ["three"],
          },
        },
      },
    },
  };
});
