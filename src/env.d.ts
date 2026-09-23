/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Auth0 tenant domain, e.g. "your-tenant.eu.auth0.com". Leave the three Auth0 values unset for local development. */
  readonly VITE_AUTH0_DOMAIN?: string;
  /** Client ID of the Auth0 single-page application. */
  readonly VITE_AUTH0_CLIENT_ID?: string;
  /** Identifier (audience) of the Auth0 API that protects /api. */
  readonly VITE_AUTH0_AUDIENCE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
