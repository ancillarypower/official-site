/** Public CORS proxies (fallback rotation) */
export const CORS_PROXIES = [
  "https://corsproxy.io/?",
  "https://api.allorigins.win/raw?url=",
];

/** Default fetch timeout in milliseconds (15 seconds) */
export const FETCH_TIMEOUT = 15_000;

/** WordPress REST API maximum per_page value */
export const WP_MAX_PER_PAGE = 100;

/** Maximum allowed model file size in bytes (100 MB) */
export const MAX_MODEL_SIZE = 100 * 1024 * 1024;

/** Maximum number of files per single upload batch */
export const MAX_BATCH_FILES = 20;

/**
 * Self-hosted decoder directories, relative to Vite's `base` (Issue #586).
 * The `self-host-decoders` plugin in vite.config.ts copies the files from
 * node_modules, so they are served same-origin and their integrity is pinned
 * by pnpm-lock.yaml. See src/lib/decoderAssets.ts for the file list.
 */
export const DRACO_DECODER_DIR = "decoders/draco/gltf/";

/** web-ifc WASM directory, relative to Vite's `base` (Issue #586). */
export const IFC_WASM_DIR = "decoders/web-ifc/";

/** Supported 3D model extensions */
export const MODEL_EXTENSIONS = ["glb", "gltf", "obj", "stl", "ifc"] as const;
export type ModelExtension = (typeof MODEL_EXTENSIONS)[number];

/** Content types available from WP REST API */
export const CONTENT_TYPES = [
  "posts",
  "pages",
  "categories",
  "tags",
  "media",
] as const;
export type ContentType = (typeof CONTENT_TYPES)[number];

/** Per-page options */
export const PER_PAGE_OPTIONS = [10, 20, 50, 100] as const;

/** Sample products (used when WooCommerce is not connected) */
export const SAMPLE_PRODUCTS = [
  { id: 1, price: 299.99, icon: "🎧" },
  { id: 2, price: 159, icon: "⌨️" },
  { id: 3, price: 89.99, icon: "📷" },
  { id: 4, price: 199.99, icon: "🔌" },
  { id: 5, price: 49.99, icon: "🖱️" },
  { id: 6, price: 179.99, icon: "💾" },
  { id: 7, price: 69.99, icon: "💡" },
  { id: 8, price: 54.99, icon: "🔆" },
] as const;
