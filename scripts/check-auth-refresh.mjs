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
      if (phase === "failure") throw httpError(config, 500);
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

  phase = "failure";
  refreshCalls = 0;
  resourceCalls.clear();
  const failed = await timeout(
    Promise.all([
      makeRequest({ url: "/resource/three", method: "GET" })(),
      makeRequest({ url: "/resource/four", method: "GET" })(),
    ]),
  );
  assert.equal(
    refreshCalls,
    1,
    "parallel 401 responses share one failed refresh",
  );
  assert.ok(
    failed.every(({ err }) => err),
    "all queued requests reject on refresh failure",
  );
  assert.equal(globalThis.__authTestClearCount, 1);
  assert.equal(globalThis.window.location.href, "/login");

  console.log("Auth refresh queue contracts passed.");
} finally {
  delete globalThis.window;
  delete globalThis.__authTestRefreshToken;
  delete globalThis.__authTestToken;
  delete globalThis.__authTestClearCount;
  delete globalThis.localStorage;
  await server.close();
}
