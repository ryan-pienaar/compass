import { Auth0Provider, useAuth0 } from "@auth0/auth0-react";
import { Compass, LogIn } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { setAuthHandlers } from "./api-fetch";

const domain = import.meta.env.VITE_AUTH0_DOMAIN;
const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID;
const audience = import.meta.env.VITE_AUTH0_AUDIENCE;

/** Without Auth0 settings (local development), the API serves a single local user. */
export const authEnabled = Boolean(domain && clientId && audience);

const currentPath = () => `${window.location.pathname}${window.location.search}`;

/**
 * Puts the app behind Auth0 sign-in. Children (the router and its queries) mount only
 * once a token source is registered, so no API request goes out without a token.
 */
export function AuthProvider({ children, onRedirect }: { children: ReactNode; onRedirect: (returnTo: string) => void }) {
  if (!authEnabled) return children;
  return (
    <Auth0Provider
      domain={domain!}
      clientId={clientId!}
      authorizationParams={{ redirect_uri: window.location.origin, audience }}
      useRefreshTokens
      cacheLocation="localstorage"
      onRedirectCallback={(appState) => onRedirect(typeof appState?.returnTo === "string" ? appState.returnTo : "/")}
    >
      <AuthGate>{children}</AuthGate>
    </Auth0Provider>
  );
}

function AuthGate({ children }: { children: ReactNode }) {
  const { isLoading, isAuthenticated, error, loginWithRedirect, getAccessTokenSilently } = useAuth0();
  const [ready, setReady] = useState(false);
  const signIn = () => void loginWithRedirect({ appState: { returnTo: currentPath() } });

  useEffect(() => {
    if (!isAuthenticated) return;
    setAuthHandlers({
      getToken: async () => {
        const token = await getAccessTokenSilently();
        if (!token) throw new Error("No access token");
        return token;
      },
      signInAgain: () => void loginWithRedirect({ appState: { returnTo: currentPath() } }),
    });
    setReady(true);
    return () => setAuthHandlers(null);
  }, [isAuthenticated, getAccessTokenSilently, loginWithRedirect]);

  if (error) return <SignInScreen onSignIn={signIn} error={error.message} />;
  if (isLoading || (isAuthenticated && !ready)) return <Splash />;
  if (!isAuthenticated) return <SignInScreen onSignIn={signIn} />;
  return children;
}

/** The signed-in person, or null in local development (no Auth0). */
export function useAccount() {
  const { user, isAuthenticated, logout } = useAuth0();
  if (!authEnabled || !isAuthenticated || !user) return null;
  return {
    name: user.name ?? user.email ?? "Signed in",
    email: user.email ?? null,
    picture: user.picture ?? null,
    signOut: () => void logout({ logoutParams: { returnTo: window.location.origin } }),
  };
}

function Splash() {
  return (
    <div className="grid min-h-svh place-items-center bg-background text-muted-foreground" aria-busy="true">
      <Compass className="size-8 animate-pulse text-primary" aria-label="Loading" />
    </div>
  );
}

function SignInScreen({ onSignIn, error }: { onSignIn: () => void; error?: string }) {
  return (
    <main className="grid min-h-svh place-items-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-primary text-primary-foreground">
          <Compass className="size-6" />
        </div>
        <div className="space-y-2">
          <h1 className="compass-display text-4xl">Compass</h1>
          <p className="text-muted-foreground">Put first things first: plan your week around what matters most.</p>
        </div>
        {error && <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</p>}
        <Button size="lg" className="w-full" onClick={onSignIn}>
          <LogIn /> Sign in
        </Button>
      </div>
    </main>
  );
}
