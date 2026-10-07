import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { codeInspectorPlugin } from 'code-inspector-plugin'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react(), codeInspectorPlugin({ bundler: 'vite' })],
  resolve: {
    alias: {
      ...(mode === 'mock' || mode === 'hybrid'
        ? { '@/request': path.resolve(__dirname, './src/mocks/request.ts') }
        : {}),
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    open: true,
    proxy: {
      '/admin-api': {
        target: 'http://127.0.0.1:48080',
        changeOrigin: true,
      },
    },
  },
}))
