/** Public CORS proxies (fallback rotation) */
export const CORS_PROXIES = [
  "https://corsproxy.io/?",
  "https://api.allorigins.win/raw?url=",
];

/** three.js Draco decoder CDN path */
export const DRACO_CDN =
  "https://cdn.jsdelivr.net/npm/three@0.160.1/examples/jsm/libs/draco/gltf/";

/** Supported 3D model extensions */
export const MODEL_EXTENSIONS = ["glb", "gltf", "obj", "stl"] as const;
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
