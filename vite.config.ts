import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import { buildConnectSrc, injectConnectSrc } from "./src/lib/csp";
import {
  DECODER_ASSETS,
  decoderMimeType,
  decoderSourcePath,
} from "./src/lib/decoderAssets";

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

/**
 * Serve the Draco and web-ifc decoders from our own origin (Issue #586).
 * Files come from node_modules, so versions follow package.json and integrity
 * is pinned by pnpm-lock.yaml. A missing required file fails dev/build.
 */
function selfHostDecoders(root: string): Plugin {
  const assets = DECODER_ASSETS.map((asset) => ({
    ...asset,
    src: decoderSourcePath(root, asset),
  })).filter((asset) => {
    if (existsSync(asset.src)) return true;
    if (asset.optional) return false;
    throw new Error(
      `[self-host-decoders] missing ${asset.src}; run pnpm install (Issue #586)`,
    );
  });
  const byOutput = new Map(assets.map((asset) => [asset.to, asset]));

  return {
    name: "self-host-decoders",
    configureServer(server) {
      const base = server.config.base;
      server.middlewares.use((req, res, next) => {
        const url = (req.url ?? "").split("?")[0] ?? "";
        const asset = url.startsWith(base) ? byOutput.get(url.slice(base.length)) : undefined;
        if (!asset) return next();
        res.setHeader("Content-Type", decoderMimeType(asset.to));
        res.end(readFileSync(asset.src));
      });
    },
    generateBundle() {
      for (const asset of assets) {
        this.emitFile({
          type: "asset",
          fileName: asset.to,
          source: readFileSync(asset.src),
        });
      }
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  return {
    base: process.env.GITHUB_ACTIONS ? "/official-site/" : "/",
    plugins: [
      react(),
      cspConnectSrc(buildConnectSrc(env)),
      selfHostDecoders(__dirname),
    ],
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
