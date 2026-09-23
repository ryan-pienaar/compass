interface AuthHandlers {
  /** Returns a current Auth0 access token (refreshed silently when needed). */
  getToken: () => Promise<string>;
  /** Sends the person back through sign-in when the session has ended. */
  signInAgain: () => void;
}

let handlers: AuthHandlers | null = null;

/** Registered by the auth gate once someone is signed in; null in local development. */
export function setAuthHandlers(next: AuthHandlers | null) {
  handlers = next;
}

/** `fetch` for the API: adds the access token (when signed in) and the browser's time zone. */
export const apiFetch: typeof fetch = async (input, init) => {
  const headers = new Headers(init?.headers);
  headers.set("X-Timezone", Intl.DateTimeFormat().resolvedOptions().timeZone);
  if (handlers) {
    try {
      headers.set("Authorization", `Bearer ${await handlers.getToken()}`);
    } catch (e) {
      // The session ended (expired refresh token, signed out elsewhere).
      handlers.signInAgain();
      throw e;
    }
  }
  const res = await fetch(input, { ...init, headers });
  if (res.status === 401) handlers?.signInAgain();
  return res;
};
