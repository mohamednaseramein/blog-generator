/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Synced with `package.json` / root release version */
  readonly VITE_APP_VERSION: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
