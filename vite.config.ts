import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import tsconfigPaths from "vite-tsconfig-paths";

// https://vite.dev/config/
export default defineConfig({
  // Deploy GitHub Pages: https://diskonnekted.github.io/dasbor-analitik-umkm/
  base: '/dasbor-analitik-umkm/',
  build: {
    sourcemap: 'hidden',
  },
  plugins: [
    react({
      babel: {
        plugins: [
          'react-dev-locator',
        ],
      },
    }),
    tailwindcss(),
    tsconfigPaths()
  ],
  // sql.js: jangan pre-bundle wasm, biarkan di-serve sebagai asset
  optimizeDeps: {
    exclude: ['sql.js'],
  },
  assetsInclude: ['**/*.wasm'],
})
