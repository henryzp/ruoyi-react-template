import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import axios, { AxiosError } from "axios";
import { createServer } from "vite";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const server = await createServer({
  configFile: false,
  root,
  mode: "test",
  appType: "custom",
  server: { middlewareMode: true, hmr: false, ws: false },
  optimizeDeps: { noDiscovery: true, include: [] },
  resolve: {
    alias: [
      {
        find: "@/store/appStore",
        replacement: path.join(
          root,
          "scripts/auth-permission-test-app-store.ts",
        ),
      },
      {
        find: "antd",
        replacement: path.join(root, "scripts/auth-refresh-test-antd.ts"),
      },
      { find: "@", replacement: path.join(root, "src") },
    ],
  },
  logLevel: "error",
});

const response = (config, data, status = 200) => ({
  config,
  data,
  headers: {},
  status,
  statusText: String(status),
});

const httpError = (config, status) =>
  new AxiosError(
    `HTTP ${status}`,
    "ERR_BAD_RESPONSE",
    config,
    {},
    response(
      config,
      { code: status, data: null, msg: `HTTP ${status}` },
      status,
    ),
  );

const makeStorage = () => {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, String(value)),
  };
};

const storageListeners = new Set();

const waitFor = async (predicate) => {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 1));
  }
  throw new Error("Timed out waiting for test request");
};

try {
  const testStorage = makeStorage();
  globalThis.localStorage = testStorage;
  globalThis.window = {
    localStorage: testStorage,
    location: { href: "" },
    addEventListener: (type, listener) => {
      if (type === "storage") storageListeners.add(listener);
    },
    removeEventListener: (type, listener) => {
      if (type === "storage") storageListeners.delete(listener);
    },
    dispatchEvent: (event) => {
      if (event.type === "storage") {
        storageListeners.forEach((listener) => listener(event));
      }
      return true;
    },
  };

  let permissionMode = "success";
  let permissionCalls = 0;
  let loginCalls = 0;
  let staleStarted;
  let rejectStale;
  let resolveStale;
  let refreshCalls = 0;
  let deferLogout = false;
  let signalLogoutStarted;
  let resolveLogout;

  axios.defaults.adapter = async (config) => {
    if (config.url.includes("/system/auth/login")) {
      loginCalls += 1;
      const body =
        typeof config.data === "string" ? JSON.parse(config.data) : config.data;
      const username = body?.username ?? "unknown";
      return response(config, {
        code: 0,
        data: {
          accessToken: `access-${username}`,
          refreshToken: `refresh-${username}`,
          userId: username === "second" ? 2 : 1,
        },
        msg: "ok",
      });
    }

    if (config.url.includes("/system/auth/refresh-token")) {
      refreshCalls += 1;
      return response(config, {
        code: 0,
        data: {
          accessToken: "access-rotated",
          refreshToken: "refresh-rotated",
        },
        msg: "ok",
      });
    }

    if (config.url.includes("/system/auth/logout")) {
      if (deferLogout) {
        signalLogoutStarted();
        await new Promise((resolve) => {
          resolveLogout = resolve;
        });
      }
      return response(config, { code: 0, data: true, msg: "ok" });
    }

    if (config.url.includes("/system/auth/get-permission-info")) {
      permissionCalls += 1;
      if (permissionMode === "stale") {
        staleStarted();
        await new Promise((_, reject) => {
          rejectStale = reject;
        });
      } else if (permissionMode === "stale-success") {
        staleStarted();
        await new Promise((resolve) => {
          resolveStale = resolve;
        });
      }
      if (permissionMode === "http403") throw httpError(config, 403);
      if (permissionMode === "http500") throw httpError(config, 500);
      if (permissionMode === "business") {
        return response(config, {
          code: 500,
          data: null,
          msg: "permission failed",
        });
      }
      if (permissionMode === "unauthorized") throw httpError(config, 401);
      if (
        permissionMode === "rotate-token" &&
        config.headers.Authorization === "Bearer access-first"
      ) {
        throw httpError(config, 401);
      }
      return response(config, {
        code: 0,
        data: {
          user: { id: 1, username: "admin", nickname: "Admin" },
          roles: ["admin"],
          permissions: ["system:user:list"],
          menus: [],
        },
        msg: "ok",
      });
    }

    throw new Error(`Unexpected test request: ${config.url}`);
  };

  const { useAuthStore } = await server.ssrLoadModule(
    "/src/store/authStore.ts",
  );
  const authSession = await server.ssrLoadModule("/src/utils/authSession.ts");
  const store = useAuthStore.getState();
  const login = (username) => store.login({ username, password: "secret" });
  const reset = () => useAuthStore.getState().clearAuth();
  const storage = globalThis.localStorage;

  permissionMode = "http500";
  await login("first");
  assert.equal(loginCalls, 1);
  assert.equal(
    permissionCalls,
    0,
    "login does not wait for permission loading",
  );
  assert.equal(storage.getItem("app-token"), "access-first");
  assert.equal(useAuthStore.getState().permissionStatus, "idle");

  assert.equal(await useAuthStore.getState().initUserInfo(), false);
  assert.equal(useAuthStore.getState().permissionStatus, "error");
  assert.equal(useAuthStore.getState().userInfo, null);
  assert.equal(storage.getItem("app-token"), "access-first");
  assert.equal(storage.getItem("app-refresh-token"), "refresh-first");
  assert.equal(storage.getItem("app-user-info"), null);
  assert.equal(storage.getItem("app-user-cache"), null);
  assert.equal(storage.getItem("app-menus-cache"), null);

  permissionMode = "http403";
  assert.equal(await useAuthStore.getState().initUserInfo(), false);
  assert.equal(useAuthStore.getState().permissionStatus, "error");
  assert.equal(storage.getItem("app-token"), "access-first");

  permissionMode = "business";
  assert.equal(await useAuthStore.getState().initUserInfo(), false);
  assert.equal(useAuthStore.getState().permissionStatus, "error");
  assert.equal(storage.getItem("app-token"), "access-first");

  permissionMode = "success";
  assert.equal(await useAuthStore.getState().initUserInfo(), true);
  assert.equal(useAuthStore.getState().permissionStatus, "ready");
  assert.equal(useAuthStore.getState().userInfo?.username, "admin");
  assert.equal(JSON.parse(storage.getItem("app-user-cache")).username, "admin");

  reset();
  assert.equal(await useAuthStore.getState().initUserInfo(), false);
  assert.equal(useAuthStore.getState().isAuthenticated, false);
  assert.equal(storage.getItem("app-token"), null);

  await login("first");
  permissionMode = "unauthorized";
  storage.removeItem("app-refresh-token");
  assert.equal(await useAuthStore.getState().initUserInfo(), false);
  assert.equal(
    storage.getItem("app-token"),
    null,
    "missing refresh token clears invalid auth",
  );
  assert.equal(useAuthStore.getState().permissionStatus, "idle");

  permissionMode = "stale";
  let signalStaleStarted;
  const staleStartedPromise = new Promise((resolve) => {
    signalStaleStarted = resolve;
  });
  staleStarted = signalStaleStarted;
  let staleLoad;
  await login("first");
  staleLoad = useAuthStore.getState().initUserInfo();
  await staleStartedPromise;
  permissionMode = "success";
  await login("second");
  rejectStale(httpError({ url: "/system/auth/get-permission-info" }, 500));
  assert.equal(await staleLoad, false);
  assert.equal(storage.getItem("app-token"), "access-second");
  assert.equal(useAuthStore.getState().permissionStatus, "idle");
  assert.equal(useAuthStore.getState().userInfo, null);

  reset();
  await login("first");
  permissionMode = "stale-success";
  let signalLogoutLoad;
  const logoutLoadStarted = new Promise((resolve) => {
    signalLogoutLoad = resolve;
  });
  staleStarted = signalLogoutLoad;
  staleLoad = useAuthStore.getState().initUserInfo();
  await logoutLoadStarted;
  reset();
  permissionMode = "success";
  resolveStale();
  assert.equal(await staleLoad, false);
  assert.equal(useAuthStore.getState().isAuthenticated, false);
  assert.equal(useAuthStore.getState().permissionStatus, "idle");
  assert.equal(useAuthStore.getState().userInfo, null);

  await login("first");
  permissionMode = "stale";
  let signalFailedLoad;
  const failedLoadStarted = new Promise((resolve) => {
    signalFailedLoad = resolve;
  });
  staleStarted = signalFailedLoad;
  staleLoad = useAuthStore.getState().initUserInfo();
  await failedLoadStarted;
  reset();
  permissionMode = "success";
  rejectStale(httpError({ url: "/system/auth/get-permission-info" }, 500));
  assert.equal(await staleLoad, false);
  assert.equal(useAuthStore.getState().isAuthenticated, false);
  assert.equal(useAuthStore.getState().permissionStatus, "idle");
  assert.equal(useAuthStore.getState().userInfo, null);

  reset();
  await login("first");
  permissionMode = "rotate-token";
  const rotatedPermissionLoad = await useAuthStore.getState().initUserInfo();
  assert.equal(
    rotatedPermissionLoad,
    true,
    JSON.stringify({
      permissionStatus: useAuthStore.getState().permissionStatus,
      permissionCalls,
      refreshCalls,
      accessToken: storage.getItem("app-token"),
    }),
  );
  assert.equal(
    refreshCalls,
    1,
    "a valid refresh can rotate the access token mid-load",
  );
  assert.equal(storage.getItem("app-token"), "access-rotated");
  assert.equal(useAuthStore.getState().permissionStatus, "ready");

  deferLogout = true;
  let announceLogoutStarted;
  const logoutStarted = new Promise((resolve) => {
    announceLogoutStarted = resolve;
  });
  signalLogoutStarted = announceLogoutStarted;
  const staleLogout = useAuthStore.getState().logout();
  await logoutStarted;
  deferLogout = false;
  await login("second");
  permissionMode = "success";
  assert.equal(await useAuthStore.getState().initUserInfo(), true);
  const sessionB = authSession.getSessionId();
  resolveLogout();
  await staleLogout;
  assert.equal(storage.getItem("app-token"), "access-second");
  assert.equal(authSession.getSessionId(), sessionB);
  assert.equal(useAuthStore.getState().isAuthenticated, true);
  assert.equal(useAuthStore.getState().permissionStatus, "ready");
  assert.equal(
    useAuthStore.getState().userInfo?.username,
    "admin",
    "a stale logout cannot clear the new session's loaded permissions",
  );

  const rotatedSessionId = authSession.getSessionId();
  authSession.setAuthTokens(
    { accessToken: "access-rotated-again", refreshToken: "refresh-rotated-again" },
    rotatedSessionId,
  );
  window.dispatchEvent({
    type: "storage",
    key: "app-token",
    storageArea: storage,
  });
  assert.equal(
    useAuthStore.getState().permissionStatus,
    "ready",
    "token rotation in another tab does not invalidate permissions",
  );

  storage.setItem("__SESSION_ID__", JSON.stringify("cross-tab-session"));
  window.dispatchEvent({
    type: "storage",
    key: "__SESSION_ID__",
    storageArea: storage,
  });
  assert.equal(useAuthStore.getState().permissionStatus, "idle");
  assert.equal(useAuthStore.getState().userInfo, null);
  assert.equal(useAuthStore.getState().isAuthenticated, true);
  assert.equal(
    storage.getItem("app-token"),
    "access-rotated-again",
    "a session change preserves the new session token",
  );

  storage.removeItem("__SESSION_ID__");
  window.dispatchEvent({
    type: "storage",
    key: "__SESSION_ID__",
    storageArea: storage,
  });
  assert.equal(useAuthStore.getState().isAuthenticated, false);
  assert.equal(useAuthStore.getState().permissionStatus, "idle");

  console.log("Auth permission lifecycle contracts passed.");
} finally {
  await new Promise((resolve) => setTimeout(resolve, 0));
  delete globalThis.localStorage;
  delete globalThis.window;
  await server.close();
}
