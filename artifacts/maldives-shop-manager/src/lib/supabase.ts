import { setAuthTokenGetter } from "@workspace/api-client-react";

export type SupabaseAuthUser = {
  id: string;
  email?: string;
  email_confirmed_at?: string | null;
  user_metadata?: Record<string, unknown>;
};

export type SupabaseSession = {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user: SupabaseAuthUser;
};

type AuthListener = (event: string, session: SupabaseSession | null) => void;

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.replace(/\/+$/, "");
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be configured.");
}

const projectHost = new URL(supabaseUrl).host;
const sessionKey = `isledesk.auth.${projectHost}`;
const verifierKey = `${sessionKey}.pkce`;
const listeners = new Set<AuthListener>();
let callbackPromise: Promise<Error | null> | null = null;
let refreshPromise: Promise<SupabaseSession | null> | null = null;

function readSession(): SupabaseSession | null {
  try {
    const raw = localStorage.getItem(sessionKey);
    if (!raw) return null;
    const value = JSON.parse(raw) as SupabaseSession;
    if (!value.access_token || !value.refresh_token || !value.user?.id) return null;
    return value;
  } catch {
    return null;
  }
}

function emit(event: string, session: SupabaseSession | null) {
  for (const listener of listeners) listener(event, session);
}

function persistSession(
  payload: Record<string, unknown>,
  event: string,
): SupabaseSession | null {
  const accessToken = payload.access_token;
  const refreshToken = payload.refresh_token;
  const user = payload.user as SupabaseAuthUser | undefined;
  if (
    typeof accessToken !== "string" ||
    typeof refreshToken !== "string" ||
    !user ||
    typeof user.id !== "string"
  ) {
    return null;
  }

  const expiresIn = typeof payload.expires_in === "number" ? payload.expires_in : 3600;
  const expiresAt =
    typeof payload.expires_at === "number"
      ? payload.expires_at
      : Math.floor(Date.now() / 1000) + expiresIn;
  const session: SupabaseSession = {
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_at: expiresAt,
    user,
  };
  localStorage.setItem(sessionKey, JSON.stringify(session));
  emit(event, session);
  return session;
}

function clearSession() {
  localStorage.removeItem(sessionKey);
  localStorage.removeItem(verifierKey);
  emit("SIGNED_OUT", null);
}

async function authRequest(
  path: string,
  body?: Record<string, unknown>,
  accessToken?: string,
): Promise<Record<string, unknown>> {
  const headers: Record<string, string> = {
    apikey: supabaseAnonKey!,
    "Content-Type": "application/json",
  };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const response = await fetch(`${supabaseUrl}/auth/v1/${path.replace(/^\/+/, "")}`, {
    method: body ? "POST" : "GET",
    headers,
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const result = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    const message =
      (typeof result.msg === "string" && result.msg) ||
      (typeof result.message === "string" && result.message) ||
      (typeof result.error_description === "string" && result.error_description) ||
      (typeof result.error === "string" && result.error) ||
      `Supabase Auth returned HTTP ${response.status}.`;
    throw new Error(message);
  }
  return result;
}

function base64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function createPkceChallenge(): Promise<string> {
  const random = crypto.getRandomValues(new Uint8Array(32));
  const verifier = base64Url(random);
  localStorage.setItem(verifierKey, verifier);
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return base64Url(new Uint8Array(digest));
}

async function processAuthCallback(): Promise<Error | null> {
  if (callbackPromise) return callbackPromise;
  callbackPromise = (async () => {
    const url = new URL(window.location.href);
    const code = url.searchParams.get("code");
    if (code) {
      try {
        const verifier = localStorage.getItem(verifierKey);
        if (!verifier) throw new Error("This sign-in link expired. Start again from the sign-in page.");
        const payload = await authRequest("token?grant_type=pkce", {
          auth_code: code,
          code_verifier: verifier,
        });
        const session = persistSession(payload, "SIGNED_IN");
        if (!session) throw new Error("Supabase did not return a sign-in session.");
        localStorage.removeItem(verifierKey);
        url.searchParams.delete("code");
        window.history.replaceState({}, document.title, `${url.pathname}${url.search}${url.hash}`);
        return null;
      } catch (error) {
        return error instanceof Error ? error : new Error("Could not finish email verification.");
      }
    }

    const fragment = new URLSearchParams(url.hash.replace(/^#/, ""));
    const accessToken = fragment.get("access_token");
    const refreshToken = fragment.get("refresh_token");
    if (accessToken && refreshToken) {
      try {
        const user = await authRequest("user", undefined, accessToken);
        const payload = {
          access_token: accessToken,
          refresh_token: refreshToken,
          expires_in: Number(fragment.get("expires_in") || 3600),
          user,
        };
        persistSession(payload, "SIGNED_IN");
        window.history.replaceState({}, document.title, `${url.pathname}${url.search}`);
      } catch (error) {
        return error instanceof Error ? error : new Error("Could not finish email verification.");
      }
    }
    return null;
  })();
  return callbackPromise;
}

async function refreshSession(session: SupabaseSession): Promise<SupabaseSession | null> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    try {
      const payload = await authRequest("token?grant_type=refresh_token", {
        refresh_token: session.refresh_token,
      });
      return persistSession(payload, "TOKEN_REFRESHED");
    } catch {
      clearSession();
      return null;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

async function getSession() {
  const callbackError = await processAuthCallback();
  if (callbackError) return { data: { session: null }, error: callbackError };
  let session = readSession();
  if (session && session.expires_at <= Math.floor(Date.now() / 1000) + 45) {
    session = await refreshSession(session);
  }
  return { data: { session }, error: null };
}

export const supabase = {
  auth: {
    getSession,
    onAuthStateChange(callback: AuthListener) {
      listeners.add(callback);
      return {
        data: {
          subscription: {
            unsubscribe: () => listeners.delete(callback),
          },
        },
      };
    },
    async signUp({
      email,
      password,
      options,
    }: {
      email: string;
      password: string;
      options?: { emailRedirectTo?: string };
    }) {
      try {
        const challenge = await createPkceChallenge();
        const query = options?.emailRedirectTo
          ? `?redirect_to=${encodeURIComponent(options.emailRedirectTo)}`
          : "";
        const payload = await authRequest(`signup${query}`, {
          email,
          password,
          code_challenge: challenge,
          code_challenge_method: "s256",
        });
        const session = persistSession(payload, "SIGNED_IN");
        return { data: { session, user: session?.user ?? (payload.user as SupabaseAuthUser | null) }, error: null };
      } catch (error) {
        return {
          data: { session: null, user: null },
          error: error instanceof Error ? error : new Error("Could not create the account."),
        };
      }
    },
    async signInWithPassword({ email, password }: { email: string; password: string }) {
      try {
        const payload = await authRequest("token?grant_type=password", { email, password });
        const session = persistSession(payload, "SIGNED_IN");
        if (!session) throw new Error("Supabase did not return a sign-in session.");
        return { data: { session, user: session.user }, error: null };
      } catch (error) {
        return {
          data: { session: null, user: null },
          error: error instanceof Error ? error : new Error("Could not sign in."),
        };
      }
    },
    async signOut() {
      const session = readSession();
      try {
        if (session) await authRequest("logout", undefined, session.access_token);
        clearSession();
        return { error: null };
      } catch (error) {
        clearSession();
        return {
          error: error instanceof Error ? error : new Error("Could not sign out."),
        };
      }
    },
  },
};

setAuthTokenGetter(async () => {
  const { data } = await getSession();
  return data.session?.access_token ?? null;
});
