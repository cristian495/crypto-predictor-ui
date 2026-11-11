/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BUY_DIP_DATA_MODE?: 'mock' | 'json';
  readonly VITE_BUY_DIP_DATA_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
