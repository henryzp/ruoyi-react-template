import { REFRESH_TOKEN_KEY, TOKEN_KEY } from "@/types/auth";

const SESSION_ID_KEY = "__SESSION_ID__";

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export type AuthLifecycleEvent = "established" | "cleared" | "changed";
type AuthLifecycleListener = (event: AuthLifecycleEvent) => void;

const listeners = new Set<AuthLifecycleListener>();
let storageListenerAttached = false;

function emitAuthLifecycle(event: AuthLifecycleEvent) {
  listeners.forEach((listener) => listener(event));
}

function handleStorage(event: StorageEvent) {
  if (event.storageArea !== window.localStorage) return;
  if (event.key !== null && event.key !== SESSION_ID_KEY) return;

  const sessionId = getSessionId();
  emitAuthLifecycle(sessionId ? "changed" : "cleared");
}

function ensureStorageListener() {
  if (typeof window !== "undefined" && !storageListenerAttached) {
    window.addEventListener("storage", handleStorage);
    storageListenerAttached = true;
  }
}

function removeStorageListenerIfUnused() {
  if (
    typeof window !== "undefined" &&
    listeners.size === 0 &&
    storageListenerAttached
  ) {
    window.removeEventListener("storage", handleStorage);
    storageListenerAttached = false;
  }
}

function createSessionId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export const getSessionId = (): string | null => {
  if (typeof window === "undefined") return null;
  try {
    const storedSessionId = window.localStorage.getItem(SESSION_ID_KEY);
    return storedSessionId === null
      ? null
      : (JSON.parse(storedSessionId) as string);
  } catch {
    return null;
  }
};

export const getAccessToken = (): string | null =>
  typeof window === "undefined" ? null : window.localStorage.getItem(TOKEN_KEY);

export const getRefreshToken = (): string | null =>
  typeof window === "undefined"
    ? null
    : window.localStorage.getItem(REFRESH_TOKEN_KEY);

export function establishSession(tokens: AuthTokens): string {
  window.localStorage.setItem(TOKEN_KEY, tokens.accessToken);
  window.localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
  const sessionId = createSessionId();
  window.localStorage.setItem(SESSION_ID_KEY, JSON.stringify(sessionId));
  emitAuthLifecycle("established");
  return sessionId;
}

export function ensureSession(): string | null {
  if (!getAccessToken()) return null;

  const existingSessionId = getSessionId();
  if (existingSessionId) return existingSessionId;

  const sessionId = createSessionId();
  window.localStorage.setItem(SESSION_ID_KEY, JSON.stringify(sessionId));
  emitAuthLifecycle("established");
  return sessionId;
}

export function setAuthTokens(
  tokens: AuthTokens,
  expectedSessionId?: string | null,
): boolean {
  if (expectedSessionId !== undefined && getSessionId() !== expectedSessionId) {
    return false;
  }

  window.localStorage.setItem(TOKEN_KEY, tokens.accessToken);
  window.localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
  return true;
}

export function clearSession(expectedSessionId?: string | null): boolean {
  if (expectedSessionId !== undefined && getSessionId() !== expectedSessionId) {
    return false;
  }

  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
  window.localStorage.removeItem(SESSION_ID_KEY);
  emitAuthLifecycle("cleared");
  return true;
}

export function subscribeAuthLifecycle(
  listener: AuthLifecycleListener,
): () => void {
  ensureStorageListener();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    removeStorageListenerIfUnused();
  };
}
