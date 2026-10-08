import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import axios, { AxiosError } from "axios";
import { createServer } from "vite";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const authStub = path.join(root, "scripts/auth-refresh-test-auth.ts");
const server = await createServer({
  configFile: false,
  root,
  mode: "test",
  appType: "custom",
  server: { middlewareMode: true, hmr: false },
  optimizeDeps: { noDiscovery: true, include: [] },
  resolve: {
    alias: [
      { find: "@/store/authStore", replacement: authStub },
      { find: "@/utils/authSession", replacement: authStub },
      {
        find: "@/router/mode",
        replacement: path.join(root, "src/router/mode.ts"),
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

const httpError = (config, status, code = status) => {
  const result = response(
    config,
    { code, data: null, msg: `HTTP ${status}` },
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

const settleWithin = (promise) =>
  Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("request did not settle")), 1500),
    ),
  ]);

try {
  globalThis.__authTestRefreshToken = "refresh-token";
  globalThis.__authTestToken = "old-token";
  globalThis.__authTestSessionId = "session-initial";
  globalThis.__authTestClearCount = 0;
  globalThis.__authTestSessionListeners = new Set();
  globalThis.window = {
    location: {
      href: "http://localhost/",
      origin: "http://localhost",
      pathname: "/system/user",
      search: "?page=2",
      hash: "",
    },
    addEventListener() {},
    removeEventListener() {},
  };
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
  const pendingRefreshes = new Map();
  let startedOldRefresh;
  let oldRefreshStarted = new Promise((resolve) => {
    startedOldRefresh = resolve;
  });
  let releaseStale401;
  let stale401StartedResolve;
  let stale401Started = new Promise((resolve) => {
    stale401StartedResolve = resolve;
  });
  let stale401Released = new Promise((resolve) => {
    releaseStale401 = resolve;
  });

  axios.defaults.adapter = async (config) => {
    if (config.url.includes("refresh-token")) {
      refreshCalls += 1;
      const requestRefreshToken = new URL(
        config.url,
        "http://localhost",
      ).searchParams.get("refreshToken");

      if (phase === "interleaved" && requestRefreshToken === "refresh-A") {
        startedOldRefresh();
        return new Promise((resolve, reject) => {
          pendingRefreshes.set("A", { resolve, reject, config });
        });
      }
      if (phase === "interleaved" && requestRefreshToken === "refresh-B") {
        return response(config, {
          code: 0,
          data: { accessToken: "access-B2", refreshToken: "refresh-B2" },
          msg: "ok",
        });
      }
      await new Promise((resolve) => setTimeout(resolve, 20));
      if (phase === "network") {
        throw new AxiosError("network down", "ERR_NETWORK", config);
      }
      if (phase === "http500") throw httpError(config, 500);
      if (phase === "http401") throw httpError(config, 401);
      if (phase === "http400") throw httpError(config, 400, 422);
      if (phase === "business400") {
        return response(config, { code: 400, data: null, msg: "expired" });
      }
      if (phase === "business401") {
        return response(config, { code: 401, data: null, msg: "expired" });
      }
      return response(config, {
        code: 0,
        data: { accessToken: "new-token", refreshToken: "new-refresh-token" },
        msg: "ok",
      });
    }

    const calls = (resourceCalls.get(config.url) ?? 0) + 1;
    resourceCalls.set(config.url, calls);
    if (phase === "stale-401") {
      stale401StartedResolve();
      await stale401Released;
      throw httpError(config, 401);
    }
    await new Promise((resolve) => setTimeout(resolve, 5));
    if (phase === "retry401" || calls === 1) throw httpError(config, 401);
    return response(config, { code: 0, data: config.url, msg: "ok" });
  };

  const { makeRequest } = await server.ssrLoadModule("/src/request/index.ts");
  const setAuth = (sessionId, accessToken, refreshToken) => {
    globalThis.__authTestSessionId = sessionId;
    globalThis.__authTestToken = accessToken;
    globalThis.__authTestRefreshToken = refreshToken;
    globalThis.__authTestSessionListeners.forEach((listener) =>
      listener("established"),
    );
  };
  const requestPair = (prefix) =>
    Promise.all([
      makeRequest({ url: `/resource/${prefix}-one`, method: "GET" })(),
      makeRequest({ url: `/resource/${prefix}-two`, method: "GET" })(),
    ]);

  const successful = await settleWithin(requestPair("success"));
  assert.ok(successful.every(({ data, err }) => data && !err));
  assert.equal(refreshCalls, 1, "same-session 401s share one refresh");
  assert.equal(resourceCalls.get("/resource/success-one"), 2);
  assert.equal(resourceCalls.get("/resource/success-two"), 2);
  assert.equal(globalThis.__authTestToken, "new-token");

  const runFailure = async (nextPhase, shouldClear) => {
    phase = nextPhase;
    refreshCalls = 0;
    resourceCalls.clear();
    setAuth(`session-${nextPhase}`, "old-token", "refresh-token");
    globalThis.window.location.href = "http://localhost/";
    const clearCountBefore = globalThis.__authTestClearCount;
    const failed = await settleWithin(requestPair(nextPhase));
    assert.equal(refreshCalls, 1, `${nextPhase} uses one refresh request`);
    assert.ok(
      failed.every(({ err }) => err),
      `all ${nextPhase} requests settle as errors`,
    );
    assert.equal(
      globalThis.__authTestClearCount - clearCountBefore,
      shouldClear ? 1 : 0,
      `${nextPhase} applies the expected auth cleanup policy`,
    );
    assert.equal(globalThis.__authTestToken, shouldClear ? null : "old-token");
    assert.equal(
      globalThis.__authTestRefreshToken,
      shouldClear ? null : "refresh-token",
    );
    assert.equal(
      globalThis.window.location.href === "http://localhost/",
      !shouldClear,
    );
  };

  await runFailure("network", false);
  await runFailure("http500", false);
  await runFailure("http400", false);
  await runFailure("http401", true);
  await runFailure("business400", true);
  await runFailure("business401", true);

  phase = "retry401";
  refreshCalls = 0;
  resourceCalls.clear();
  setAuth("session-retry", "old-token", "refresh-token");
  const retry401 = await settleWithin(
    makeRequest({ url: "/resource/retry401", method: "GET" })(),
  );
  assert.ok(retry401.err, "second 401 is returned as an error");
  assert.equal(refreshCalls, 1, "a replayed request is never refreshed twice");
  assert.equal(resourceCalls.get("/resource/retry401"), 2);

  const runSessionInterleave = async (oldResult) => {
    phase = "interleaved";
    refreshCalls = 0;
    resourceCalls.clear();
    pendingRefreshes.clear();
    oldRefreshStarted = new Promise((resolve) => {
      startedOldRefresh = resolve;
    });
    setAuth("session-A", "access-A", "refresh-A");
    const oldRequest = makeRequest({
      url: `/resource/old-${oldResult}`,
      method: "GET",
    })();
    await settleWithin(oldRefreshStarted);

    setAuth("session-B", "access-B", "refresh-B");
    const newRequest = await settleWithin(
      makeRequest({ url: `/resource/new-${oldResult}`, method: "GET" })(),
    );
    assert.ok(!newRequest.err, "new session request refreshes independently");
    assert.equal(
      refreshCalls,
      2,
      "each session starts its own refresh request",
    );
    assert.equal(globalThis.__authTestToken, "access-B2");
    assert.equal(globalThis.__authTestRefreshToken, "refresh-B2");

    const old = pendingRefreshes.get("A");
    if (oldResult === "success") {
      old.resolve(
        response(old.config, {
          code: 0,
          data: { accessToken: "stale-A2", refreshToken: "stale-A2-refresh" },
          msg: "ok",
        }),
      );
    } else {
      old.reject(httpError(old.config, 401));
    }
    const oldOutcome = await settleWithin(oldRequest);
    assert.ok(oldOutcome.err, `old session ${oldResult} does not replay`);
    assert.equal(globalThis.__authTestToken, "access-B2");
    assert.equal(globalThis.__authTestRefreshToken, "refresh-B2");
  };

  await runSessionInterleave("failure");
  await runSessionInterleave("success");

  phase = "stale-401";
  refreshCalls = 0;
  resourceCalls.clear();
  setAuth("session-stale-request", "access-stale", "refresh-stale");
  stale401Started = new Promise((resolve) => {
    stale401StartedResolve = resolve;
  });
  stale401Released = new Promise((resolve) => {
    releaseStale401 = resolve;
  });
  const staleRequest = makeRequest({
    url: "/resource/stale-401",
    method: "GET",
  })();
  await settleWithin(stale401Started);
  setAuth("session-current", "access-current", "refresh-current");
  releaseStale401();
  const staleResponse = await settleWithin(staleRequest);
  assert.ok(staleResponse.err, "an old-session 401 rejects without replay");
  assert.equal(refreshCalls, 0, "an old-session 401 does not start refresh");
  assert.equal(globalThis.__authTestToken, "access-current");
  assert.equal(globalThis.__authTestRefreshToken, "refresh-current");

  console.log("Auth refresh session contracts passed.");
} finally {
  delete globalThis.window;
  delete globalThis.localStorage;
  delete globalThis.__authTestRefreshToken;
  delete globalThis.__authTestToken;
  delete globalThis.__authTestSessionId;
  delete globalThis.__authTestClearCount;
  delete globalThis.__authTestSessionListeners;
  await server.close();
}
