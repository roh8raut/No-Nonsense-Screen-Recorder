import { defineConfig } from 'vite'
import { crx } from '@crxjs/vite-plugin'
import zip from 'vite-plugin-zip-pack'
import manifest from './manifest.config.js'
import { name, version } from './package.json'

export default defineConfig({
  server: {
    // Fixed port + CORS so the worker can fetch @crxjs's HMR client (else register fails).
    port: 5173,
    strictPort: true,
    cors: { origin: '*' },
  },
  plugins: [
    crx({ manifest }),
    zip({ outDir: 'release', outFileName: `crx-${name}-${version}.zip` }),
  ],
  build: {
    rollupOptions: {
      input: {
        // Explicitly define all entry points
        popup: 'src/popup.html',
        offscreen: 'src/offscreen.html',
      },
    },
  },
})
