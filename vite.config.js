import { defineConfig } from 'vite'
import { crx } from '@crxjs/vite-plugin'
import zip from 'vite-plugin-zip-pack'
import manifest from './manifest.config.js'
import { name, version } from './package.json'

export default defineConfig({
  plugins: [
    crx({ manifest }),
    zip({ outDir: 'release', outFileName: `crx-${name}-${version}.zip` }),
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
