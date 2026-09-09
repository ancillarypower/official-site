/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_WP_URL: string;
  readonly VITE_WOO_KEY: string;
  readonly VITE_WOO_SECRET: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
