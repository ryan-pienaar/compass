import { createRemoteJWKSet, jwtVerify } from "jose";
import type { Authenticate } from "./context.ts";

/**
 * Verifies Auth0 access tokens issued for this API: RS256, signed by the tenant's keys
 * (fetched once and cached), with the tenant as issuer and the API as audience.
 * The token's subject (`sub`) identifies the person whose data a request may touch.
 */
export function auth0Authenticator({ domain, audience }: { domain: string; audience: string }): Authenticate {
  const issuer = `https://${domain}/`;
  const jwks = createRemoteJWKSet(new URL(`${issuer}.well-known/jwks.json`));
  return async (request) => {
    const match = /^Bearer\s+(\S+)$/i.exec(request.headers.get("authorization") ?? "");
    if (!match) return null;
    try {
      const { payload } = await jwtVerify(match[1], jwks, { issuer, audience, algorithms: ["RS256"], requiredClaims: ["sub", "exp"] });
      return typeof payload.sub === "string" && payload.sub ? { userId: payload.sub } : null;
    } catch {
      return null;
    }
  };
}

/** Local development without Auth0: all data belongs to one local user. */
export const LOCAL_USER_ID = "local|dev";
export const localAuthenticator = (): Authenticate => async () => ({ userId: LOCAL_USER_ID });

/**
 * Auth0 when AUTH0_DOMAIN and AUTH0_AUDIENCE are set. Without them, only local
 * development may continue (as the local user); anywhere else it is a configuration error.
 */
export function authenticatorFromEnv(env: Record<string, string | undefined>, { allowLocal }: { allowLocal: boolean }): Authenticate {
  const domain = env.AUTH0_DOMAIN?.replace(/^https?:\/\//, "").replace(/\/+$/, "");
  const audience = env.AUTH0_AUDIENCE;
  if (domain && audience) return auth0Authenticator({ domain, audience });
  if (allowLocal) return localAuthenticator();
  throw new Error("Auth0 is not configured: set AUTH0_DOMAIN and AUTH0_AUDIENCE.");
}
