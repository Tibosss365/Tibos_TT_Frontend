import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// A new id per build lets a tab that is already open notice that a newer
// version has been deployed (see UpdateNotice).
const BUILD_ID = String(Date.now())

function versionFile() {
  return {
    name: 'version-file',
    apply: 'build',
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ version: BUILD_ID }) })
    },
  }
}

export default defineConfig(({ command }) => ({
  plugins: [react(), versionFile()],
  define: {
    __APP_VERSION__: JSON.stringify(command === 'build' ? BUILD_ID : 'dev'),
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
}))
