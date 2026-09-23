import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-512.png'],
      manifest: {
        name: 'NEW ALMAKKA FACTORY',
        short_name: 'المکہ فیکٹری',
        description: 'نیو المکہ فیکٹری — ماربل فیکٹری کھاتہ، بل، لیبر، اسٹاک اور خرچہ انتظامی ایپ',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#1e3a8a',
        theme_color: '#7c3aed',
        lang: 'ur',
        dir: 'rtl',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff,woff2,ico}'],
        // xlsx + recharts + jspdf + docx make a big bundle; raise precache limit (default 2 MiB)
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        navigateFallback: 'index.html',
        runtimeCaching: [
          {
            // Cache Google Fonts so Urdu Nastaliq renders even offline (app shell only — data needs internet)
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 }
            }
          }
        ]
      },
      devOptions: { enabled: false }
    })
  ],
  build: {
    sourcemap: false,
    chunkSizeWarningLimit: 1600
  }
});
