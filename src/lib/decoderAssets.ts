import { DRACO_DECODER_DIR, IFC_WASM_DIR } from "./constants";

/**
 * Decoder files served from our own origin instead of a public CDN
 * (Issue #586). Consumed by the `self-host-decoders` plugin in
 * vite.config.ts (dev middleware + build emit) and by tests.
 *
 * This module runs in Node (vite.config.ts) as well as in tests, so it must
 * not touch `import.meta.env` or any browser-only API.
 */
export interface DecoderAsset {
  /** npm package that ships the file */
  pkg: string;
  /** Path inside the package */
  from: string;
  /** Output path relative to the build root / Vite base */
  to: string;
  /** Copied only when present (e.g. the multi-threaded web-ifc build) */
  optional?: boolean;
}

const DRACO_SOURCE_DIR = "examples/jsm/libs/draco/gltf/";

/**
 * DRACOLoader fetches `draco_wasm_wrapper.js` + `draco_decoder.wasm`, or
 * `draco_decoder.js` when WebAssembly is unavailable. web-ifc fetches
 * `web-ifc.wasm`, or `web-ifc-mt.wasm` only on cross-origin-isolated pages.
 */
export const DECODER_ASSETS: readonly DecoderAsset[] = [
  ...["draco_decoder.wasm", "draco_wasm_wrapper.js", "draco_decoder.js"].map(
    (file): DecoderAsset => ({
      pkg: "three",
      from: `${DRACO_SOURCE_DIR}${file}`,
      to: `${DRACO_DECODER_DIR}${file}`,
    }),
  ),
  { pkg: "web-ifc", from: "web-ifc.wasm", to: `${IFC_WASM_DIR}web-ifc.wasm` },
  {
    pkg: "web-ifc",
    from: "web-ifc-mt.wasm",
    to: `${IFC_WASM_DIR}web-ifc-mt.wasm`,
    optional: true,
  },
];

/** Absolute path of an asset's source file inside `<root>/node_modules`. */
export function decoderSourcePath(root: string, asset: DecoderAsset): string {
  return `${root.replace(/[\\/]+$/, "")}/node_modules/${asset.pkg}/${asset.from}`;
}

/** Content-Type for a decoder file (WASM streaming needs application/wasm). */
export function decoderMimeType(path: string): string {
  return path.endsWith(".wasm") ? "application/wasm" : "text/javascript";
}
