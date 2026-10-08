import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const storageValues = new Map();
const storageListeners = new Set();
const localStorage = {
  clear() {
    storageValues.clear();
  },
  getItem(key) {
    return storageValues.get(key) ?? null;
  },
  removeItem(key) {
    storageValues.delete(key);
  },
  setItem(key, value) {
    storageValues.set(key, String(value));
  },
};
const window = {
  localStorage,
  location: { href: "https://app.example/", origin: "https://app.example" },
  addEventListener(type, listener) {
    if (type === "storage") storageListeners.add(listener);
  },
  removeEventListener(type, listener) {
    if (type === "storage") storageListeners.delete(listener);
  },
  dispatchEvent(event) {
    storageListeners.forEach((listener) => listener(event));
    return true;
  },
};

globalThis.window = window;
globalThis.localStorage = localStorage;

const server = await createServer({
  configFile: false,
  root,
  mode: "test",
  appType: "custom",
  server: { middlewareMode: true, hmr: false, ws: false },
  optimizeDeps: { noDiscovery: true, include: [] },
  resolve: { alias: [{ find: "@", replacement: path.join(root, "src") }] },
  logLevel: "error",
});

try {
  const session = await server.ssrLoadModule("/src/utils/authSession.ts");
  const redirect = await server.ssrLoadModule("/src/utils/authRedirect.ts");
  const { TOKEN_KEY, REFRESH_TOKEN_KEY } = await server.ssrLoadModule(
    "/src/types/auth.ts",
  );
  const SESSION_ID_KEY = "__SESSION_ID__";
  const events = [];
  const unsubscribe = session.subscribeAuthLifecycle((event) => events.push(event));

  const tokensA = { accessToken: "access-a", refreshToken: "refresh-a" };
  assert.equal(session.setAuthTokens(tokensA), true);
  const legacySession = session.ensureSession();
  assert.ok(legacySession, "ensureSession creates a session for existing tokens");
  assert.equal(session.ensureSession(), legacySession);
  assert.equal(JSON.parse(localStorage.getItem(SESSION_ID_KEY)), legacySession);
  assert.deepEqual(events, ["established"], "same-tab session migration announces establishment once");

  const sessionA = session.establishSession(tokensA);
  assert.ok(sessionA, "establishSession creates a session id");
  assert.equal(session.getSessionId(), sessionA);
  assert.equal(localStorage.getItem(TOKEN_KEY), tokensA.accessToken);
  assert.equal(localStorage.getItem(REFRESH_TOKEN_KEY), tokensA.refreshToken);
  assert.deepEqual(events, ["established", "established"], "same-tab login announces a new session");

  assert.equal(session.ensureSession(), sessionA);
  assert.equal(session.ensureSession(), sessionA, "ensureSession keeps an existing session stable");
  assert.deepEqual(events, ["established", "established"], "ensuring an existing session emits no lifecycle event");

  const tokensRotated = { accessToken: "access-a2", refreshToken: "refresh-a2" };
  assert.equal(session.setAuthTokens(tokensRotated, sessionA), true);
  assert.equal(session.getSessionId(), sessionA, "normal token rotation keeps the session id");
  assert.deepEqual(events, ["established", "established"], "same-tab token rotation is not a session change");

  const tokensB = { accessToken: "access-b", refreshToken: "refresh-b" };
  const sessionB = session.establishSession(tokensB);
  assert.notEqual(sessionB, sessionA, "a new login establishes a distinct session");
  assert.equal(session.clearSession(sessionA), false, "stale clear cannot remove a newer session");
  assert.equal(session.getSessionId(), sessionB);
  assert.equal(localStorage.getItem(TOKEN_KEY), tokensB.accessToken);
  assert.equal(
    session.setAuthTokens({ accessToken: "stale-access", refreshToken: "stale-refresh" }, sessionA),
    false,
    "stale refresh cannot overwrite tokens for a newer session",
  );
  assert.equal(localStorage.getItem(TOKEN_KEY), tokensB.accessToken);

  const sessionC = session.establishSession({
    accessToken: "access-c",
    refreshToken: "refresh-c",
  });
  assert.equal(session.clearSession(sessionC), true, "current same-tab session can be cleared");
  assert.equal(session.getSessionId(), null);
  assert.equal(events.at(-1), "cleared", "same-tab clear announces a lifecycle event");
  const sessionForCrossTab = session.establishSession(tokensB);

  const eventsBeforeCrossTab = events.length;
  localStorage.setItem(TOKEN_KEY, "access-b2");
  window.dispatchEvent({
    type: "storage",
    key: TOKEN_KEY,
    oldValue: tokensB.accessToken,
    newValue: "access-b2",
    storageArea: localStorage,
  });
  assert.equal(events.length, eventsBeforeCrossTab, "cross-tab token rotation is not a session change");

  localStorage.setItem(SESSION_ID_KEY, JSON.stringify("session-from-another-tab"));
  window.dispatchEvent({
    type: "storage",
    key: SESSION_ID_KEY,
    oldValue: JSON.stringify(sessionForCrossTab),
    newValue: JSON.stringify("session-from-another-tab"),
    storageArea: localStorage,
  });
  assert.equal(events.at(-1), "changed", "cross-tab session establishment announces a change");

  localStorage.removeItem(SESSION_ID_KEY);
  window.dispatchEvent({
    type: "storage",
    key: SESSION_ID_KEY,
    oldValue: JSON.stringify("session-from-another-tab"),
    newValue: null,
    storageArea: localStorage,
  });
  assert.equal(events.at(-1), "cleared", "cross-tab session removal announces a clear");
  unsubscribe();

  assert.equal(redirect.getSafeRedirectPath("/system/user?status=active#profile"), "/system/user?status=active#profile");
  for (const unsafe of ["//outside.example/path", "https://outside.example/path", "/login?redirectUrl=/system/user", "/login#section"]) {
    assert.equal(redirect.getSafeRedirectPath(unsafe), "/home", `unsafe redirect is rejected: ${unsafe}`);
  }

  const browserHref = "https://app.example/system/user?status=active#profile";
  const browserLoginUrl = redirect.createLoginRedirectUrl("browser", browserHref);
  assert.equal(
    new URL(browserLoginUrl, "https://app.example").searchParams.get("redirectUrl"),
    "/system/user?status=active#profile",
    "browser mode preserves pathname, query, and hash in the login return target",
  );

  const hashHref = "https://app.example/#/system/user?status=active#profile";
  const hashLoginUrl = redirect.createLoginRedirectUrl("hash", hashHref);
  assert.equal(
    new URLSearchParams(hashLoginUrl.split("?", 2)[1]).get("redirectUrl"),
    "/system/user?status=active#profile",
    "hash mode preserves the routed pathname, query, and nested hash",
  );

  console.log("Auth session and redirect contracts passed.");
} finally {
  await server.close();
}
