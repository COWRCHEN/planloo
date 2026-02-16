import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import cloudflare from '@astrojs/cloudflare';

// https://astro.build/config
export default defineConfig({
  output: 'static', // Default in Astro 5; use prerender = false on pages for SSR (with adapter)

  adapter: cloudflare({
    mode: 'directory',
    routes: {
      strategy: 'include',
      include: ['/api/*', '/dashboard/*', '/rsvp/*']
    },
    imageService: 'cloudflare',
    // Disable platform proxy in dev to avoid "write EOF" / stream errors on Windows.
    // Use `astro build` + `wrangler pages dev ./dist` to test Cloudflare bindings locally.
    platformProxy: {
      enabled: false
    }
  }),

  integrations: [
    react(),
    tailwind({
      applyBaseStyles: false // We'll apply our own base styles
    })
  ],

  image: {
    service: {
      entrypoint: 'astro/assets/services/sharp'
    }
  },

  vite: {
    optimizeDeps: {
      include: ['react', 'react-dom', 'nanostores', '@nanostores/react', 'konva', 'react-konva']
    },
    ssr: {
      noExternal: ['better-auth', 'konva', 'react-konva']
    }
  },

  // Server configuration for local development
  server: {
    port: 4321,
    host: true
  },

  // Security headers
  security: {
    checkOrigin: true
  }
});
