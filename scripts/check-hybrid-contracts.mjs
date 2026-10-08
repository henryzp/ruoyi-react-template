import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const createTestServer = (mode) =>
  createServer({
    configFile: false,
    root,
    mode,
    appType: "custom",
    server: { middlewareMode: true, hmr: false },
    optimizeDeps: { noDiscovery: true, include: [] },
    ssr: { noExternal: ["antd"] },
    resolve: {
      alias: [
        {
          find: "@/store/authStore",
          replacement: path.join(root, "scripts/hybrid-test-auth.ts"),
        },
        {
          find: "antd",
          replacement: path.join(root, "scripts/hybrid-test-antd.ts"),
        },
        { find: "@", replacement: path.join(root, "src") },
      ],
    },
    logLevel: "error",
  });

let server;
let mockServer;

try {
  server = await createTestServer("hybrid");
  mockServer = await createTestServer("mock");
  const { makeRequest } = await server.ssrLoadModule("/src/mocks/request.ts");
  const { makeRequest: makeRealRequest } = await server.ssrLoadModule(
    "/src/request/index.ts",
  );
  const { getErrors, resetErrors } = await server.ssrLoadModule(
    "/scripts/hybrid-test-antd.ts",
  );
  const response = (data, status = 200, config = {}) => ({
    data,
    status,
    statusText: String(status),
    headers: {},
    config,
  });
  const httpError = (status, config = {}) => {
    const error = new Error(`HTTP ${status}`);
    error.response = response(
      { code: status, data: null, msg: `HTTP ${status}` },
      status,
      config,
    );
    error.config = config;
    error.isAxiosError = true;
    return error;
  };
  const adapterFor = (result) => async (config) => {
    if (result instanceof Error) throw httpError(result.status, config);
    return response(result, 200, config);
  };

  let calls = 0;
  const real = await makeRequest({
    url: "/system/dict-type/page",
    method: "GET",
    params: { fixed: "yes" },
    adapter: async (config) => {
      calls += 1;
      assert.equal(config.params.fixed, "yes");
      assert.equal(config.params.runtime, "passed");
      return response(
        { code: 0, data: { source: "real" }, msg: "ok" },
        200,
        config,
      );
    },
  })({ params: { runtime: "passed" } });
  assert.equal(calls, 1, "hybrid sends request to real transport");
  assert.deepEqual(
    real.data,
    { source: "real" },
    "real HTTP 200 wins without mock fallback",
  );

  resetErrors();
  const fallback = await makeRequest({
    url: "/system/dict-type/page",
    method: "GET",
    adapter: async (config) => {
      throw httpError(404, config);
    },
  })();
  assert.equal(
    fallback.err,
    null,
    "404 with a registered route falls back to mock",
  );
  assert.equal(
    fallback.response.status,
    404,
    "fallback retains the real 404 response",
  );
  assert.equal(
    getErrors().length,
    0,
    "hybrid matched 404 does not show a toast",
  );

  resetErrors();
  const notFound = await makeRequest({
    url: "/no/mock/route",
    method: "GET",
    adapter: async (config) => {
      throw httpError(404, config);
    },
  })();
  assert.match(notFound.err.message, /未配置 mock 接口/);
  assert.equal(
    notFound.response.status,
    404,
    "unmatched 404 retains real response",
  );
  assert.equal(
    getErrors().length,
    0,
    "hybrid unmatched 404 does not show a toast",
  );

  resetErrors();
  const ordinary404 = await makeRealRequest({
    url: "/system/dict-type/page",
    method: "GET",
    adapter: async (config) => {
      throw httpError(404, config);
    },
  })();
  assert.equal(ordinary404.response?.status, 404);
  assert.equal(getErrors().length, 1, "ordinary real 404 keeps its toast");

  resetErrors();
  for (const status of [401, 403, 500]) {
    const result = await makeRequest({
      url: "/system/dict-type/page",
      method: "GET",
      adapter: async (config) => {
        throw httpError(status, config);
      },
    })();
    assert.ok(result.err, `HTTP ${status} remains a real error`);
    assert.notEqual(
      result.response?.status,
      404,
      `HTTP ${status} does not fall back`,
    );
  }
  assert.ok(getErrors().length >= 2, "hybrid 403 and 500 retain error toasts");

  const businessError = await makeRequest({
    url: "/system/dict-type/page",
    method: "GET",
    adapter: adapterFor({ code: 500, data: null, msg: "business error" }),
  })();
  assert.match(businessError.err.message, /business error/);
  assert.equal(
    businessError.response?.status,
    200,
    "HTTP 200 business errors do not fall back",
  );

  const networkError = await makeRequest({
    url: "/system/dict-type/page",
    method: "GET",
    adapter: async () => {
      const error = new Error("network");
      error.request = {};
      throw error;
    },
  })();
  assert.match(networkError.err.message, /network/);
  assert.equal(networkError.response, null, "network errors do not fall back");

  const raw = await makeRequest({
    url: "/captcha/get",
    method: "GET",
    rawResponse: true,
    adapter: adapterFor({
      uuid: "challenge-id",
      image: "data:image/png;base64,AA==",
    }),
  })();
  assert.deepEqual(raw.data, {
    uuid: "challenge-id",
    image: "data:image/png;base64,AA==",
  });

  const { makeRequest: makeStrictMockRequest } = await mockServer.ssrLoadModule(
    "/src/mocks/request.ts",
  );
  let strictMockAdapterCalls = 0;
  const strictMock = await makeStrictMockRequest({
    url: "/system/dict-type/page",
    method: "GET",
    adapter: async () => {
      strictMockAdapterCalls += 1;
      return response({ code: 0, data: "unexpected network", msg: "ok" });
    },
  })();
  assert.equal(strictMock.err, null, "mock mode serves the local handler");
  assert.equal(
    strictMockAdapterCalls,
    0,
    "mock mode never invokes the HTTP adapter",
  );

  console.log("Hybrid request contracts passed.");
} finally {
  await Promise.all(
    [server, mockServer].filter(Boolean).map((vite) => vite.close()),
  );
}
