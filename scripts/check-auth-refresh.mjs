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
  server: { middlewareMode: true, hmr: false },
  optimizeDeps: { noDiscovery: true, include: [] },
  resolve: {
    alias: [
      {
        find: "@/store/authStore",
        replacement: path.join(root, "scripts/auth-refresh-test-auth.ts"),
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

const httpError = (config, status) => {
  const result = response(
    config,
    { code: status, data: null, msg: "failed" },
    status,
  );
  return new AxiosError(
    `HTTP ${status}`,
    "ERR_BAD_RESPONSE",
    config,
    {},
    result,
  );
};

try {
  globalThis.__authTestRefreshToken = "refresh-token";
  globalThis.__authTestToken = "old-token";
  globalThis.__authTestClearCount = 0;
  globalThis.window = { location: { href: "" } };
  globalThis.localStorage = {
    values: new Map(),
    getItem(key) {
      return this.values.get(key) ?? null;
    },
    setItem(key, value) {
      this.values.set(key, value);
    },
  };

  let phase = "success";
  let refreshCalls = 0;
  const resourceCalls = new Map();
  axios.defaults.adapter = async (config) => {
    if (config.url.includes("refresh-token")) {
      refreshCalls += 1;
      await new Promise((resolve) => setTimeout(resolve, 30));
      if (phase === "network") throw new AxiosError("network down", "ERR_NETWORK", config);
      if (phase === "http500") throw httpError(config, 500);
      if (phase === "http401") throw httpError(config, 401);
      if (phase === "business400") {
        return response(config, { code: 400, data: null, msg: "expired" });
      }
      if (phase === "business401") {
        return response(config, { code: 401, data: null, msg: "expired" });
      }
      if (phase === "session-change") {
        globalThis.__authTestToken = "new-session-token";
        globalThis.__authTestRefreshToken = "new-session-refresh";
      }
      return response(config, {
        code: 0,
        data: { accessToken: "new-token", refreshToken: "new-refresh-token" },
        msg: "ok",
      });
    }

    const calls = (resourceCalls.get(config.url) ?? 0) + 1;
    resourceCalls.set(config.url, calls);
    if (calls === 1) {
      await new Promise((resolve) => setTimeout(resolve, 10));
      throw httpError(config, 401);
    }
    return response(config, { code: 0, data: config.url, msg: "ok" });
  };

  const { makeRequest } = await server.ssrLoadModule("/src/request/index.ts");
  const timeout = (promise) =>
    Promise.race([
      promise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("request did not settle")), 1000),
      ),
    ]);

  const successful = await timeout(
    Promise.all([
      makeRequest({ url: "/resource/one", method: "GET" })(),
      makeRequest({ url: "/resource/two", method: "GET" })(),
    ]),
  );
  assert.deepEqual(
    successful.map(({ data, err }) => [data, err]),
    [
      ["/resource/one", null],
      ["/resource/two", null],
    ],
  );
  assert.equal(refreshCalls, 1, "parallel 401 responses share one refresh");
  assert.equal(resourceCalls.get("/resource/one"), 2);
  assert.equal(resourceCalls.get("/resource/two"), 2);

  const runFailure = async (nextPhase, shouldClear) => {
    phase = nextPhase;
    refreshCalls = 0;
    resourceCalls.clear();
    globalThis.__authTestToken = "old-token";
    globalThis.__authTestRefreshToken = "refresh-token";
    globalThis.window.location.href = "";
    const clearCountBefore = globalThis.__authTestClearCount;
    const failed = await timeout(Promise.all([
      makeRequest({ url: `/resource/${nextPhase}-one`, method: "GET" })(),
      makeRequest({ url: `/resource/${nextPhase}-two`, method: "GET" })(),
    ]));
    assert.equal(refreshCalls, 1, `parallel 401 responses share ${nextPhase} refresh`);
    assert.ok(failed.every(({ err }) => err), `all queued requests reject after ${nextPhase}`);
    assert.equal(globalThis.__authTestClearCount - clearCountBefore, shouldClear ? 1 : 0);
    assert.equal(globalThis.__authTestToken, shouldClear ? null : "old-token");
    assert.equal(globalThis.__authTestRefreshToken, shouldClear ? null : "refresh-token");
    assert.equal(globalThis.window.location.href, shouldClear ? "/login" : "");
  };

  await runFailure("network", false);
  await runFailure("http500", false);
  await runFailure("http401", true);
  await runFailure("business400", true);
  await runFailure("business401", true);

  phase = "session-change";
  resourceCalls.clear();
  globalThis.__authTestToken = "old-token";
  globalThis.__authTestRefreshToken = "refresh-token";
  const beforeSessionChange = globalThis.__authTestClearCount;
  const sessionChanged = await timeout(Promise.all([
    makeRequest({ url: "/resource/session-change-one", method: "GET" })(),
    makeRequest({ url: "/resource/session-change-two", method: "GET" })(),
  ]));
  assert.ok(sessionChanged.every(({ err }) => err), "old-session requests reject after session changes");
  assert.equal(globalThis.__authTestToken, "new-session-token", "old refresh does not replace new access token");
  assert.equal(globalThis.__authTestRefreshToken, "new-session-refresh", "old refresh does not replace new refresh token");
  assert.equal(globalThis.__authTestClearCount, beforeSessionChange, "old refresh does not clear new session");

  phase = "success";
  globalThis.__authTestToken = "old-token";
  globalThis.__authTestRefreshToken = null;
  const noRefresh = await timeout(makeRequest({ url: "/resource/no-refresh", method: "GET" })());
  assert.ok(noRefresh.err, "missing refresh token rejects original request");
  assert.equal(globalThis.__authTestToken, null, "missing refresh token clears the current auth session");

  console.log("Auth refresh queue contracts passed.");
} finally {
  delete globalThis.window;
  delete globalThis.__authTestRefreshToken;
  delete globalThis.__authTestToken;
  delete globalThis.__authTestClearCount;
  delete globalThis.localStorage;
  await server.close();
}
