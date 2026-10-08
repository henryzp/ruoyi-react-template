/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string;
  readonly VITE_APP_BASE_API: string;
  readonly VITE_APP_PORT?: string;
  readonly VITE_APP_CAPTCHA_ENABLE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
