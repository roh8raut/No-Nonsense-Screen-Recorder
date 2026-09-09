import { defineManifest } from '@crxjs/vite-plugin'

export default defineManifest({
  manifest_version: 3,
  name: 'No Nonsense Screen Recorder',
  version: '0.0.4',
  description: 'Capture your entire screen or specific windows and quickly save or share recordings.',
  permissions: [
    'downloads',
    'storage',
    'offscreen'
  ],
  background: {
    service_worker: 'src/background.js',
    type: 'module'
  },
  action: {
    default_popup: 'src/popup.html',
    default_icon: {
      '128': 'icons/icon128.png'
    }
  },
  icons: {
    '128': 'icons/icon128.png'
  }
})
