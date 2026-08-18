/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  // NOTE: AI provider keys are NEVER exposed via VITE_ env vars — they are
  // configured server-side only (Supabase Edge Functions: ai-proxy).
  readonly VITE_ENABLE_AI_FEATURES?: string;
  readonly VITE_DEV_MODE?: string;
  // Google OAuth sign-in — only enable after configuring the provider in Supabase Auth.
  readonly VITE_ENABLE_GOOGLE_LOGIN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
