import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { codeInspectorPlugin } from "code-inspector-plugin";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const developmentEnv =
    mode === "hybrid" ? loadEnv("development", process.cwd(), "") : {};
  const mergedEnv = { ...developmentEnv, ...env };

  return {
    plugins: [react(), codeInspectorPlugin({ bundler: "vite" })],
    // Vite's mode remains "hybrid" for aliasing while client config inherits
    // development values, with any explicitly supplied hybrid values taking priority.
    define: Object.fromEntries(
      Object.entries(mergedEnv)
        .filter(([key]) => key.startsWith("VITE_"))
        .map(([key, value]) => [
          `import.meta.env.${key}`,
          JSON.stringify(value),
        ]),
    ),
    resolve: {
      alias: {
        ...(mode === "mock" || mode === "hybrid"
          ? { "@/request": path.resolve(__dirname, "./src/mocks/request.ts") }
          : {}),
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      port: 3000,
      open: true,
      proxy: {
        "/admin-api": {
          target: "http://127.0.0.1:48080",
          changeOrigin: true,
        },
      },
    },
  };
});
