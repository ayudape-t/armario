import react from '@vitejs/plugin-react';
import { defineConfig, type Connect, type Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// En desarrollo, /app/<ruta> debe servir la SPA (en Cloudflare lo hace public/_redirects).
const reescribirApp: Connect.NextHandleFunction = (req, _res, next) => {
  const ruta = req.url?.split('?')[0] ?? '';
  if (ruta.startsWith('/app/') && !ruta.includes('.') && !ruta.startsWith('/app/@')) req.url = '/app/index.html';
  next();
};
const spaEnApp: Plugin = {
  name: 'spa-en-app',
  configureServer: (s) => void s.middlewares.use(reescribirApp),
  configurePreviewServer: (s) => void s.middlewares.use(reescribirApp),
};

export default defineConfig({
  plugins: [
    spaEnApp,
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      scope: '/app/',
      manifest: {
        name: 'Armario',
        short_name: 'Armario',
        start_url: '/app/',
        scope: '/app/',
        display: 'standalone',
        lang: 'es-PE',
        background_color: '#f6efe9',
        theme_color: '#7a4e3a',
        icons: [
          { src: '/icono-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icono-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: { navigateFallback: '/app/index.html', navigateFallbackAllowlist: [/^\/app/] },
    }),
  ],
  build: {
    rollupOptions: {
      input: {
        inicio: 'index.html',
        terminos: 'terminos.html',
        privacidad: 'privacidad.html',
        app: 'app/index.html',
      },
    },
  },
});
