import { defineConfig } from 'vite'
import { crx } from '@crxjs/vite-plugin'
import manifest from './manifest.config.js'

export default defineConfig({
  plugins: [
    crx({ manifest }),
  ],
  build: {
    rollupOptions: {
      input: {
        // Explicitly define all entry points
        popup: 'src/popup.html',
        extensionPage: 'src/extension-page.html',
      },
    },
  },
})
