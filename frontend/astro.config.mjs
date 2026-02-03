import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import cloudflare from '@astrojs/cloudflare';

// https://astro.build/config
export default defineConfig({
  output: 'hybrid', // Enable hybrid rendering (SSG by default, opt-in to SSR)

  adapter: cloudflare({
    mode: 'directory',
    routes: {
      strategy: 'include',
      include: ['/api/*', '/dashboard/*', '/rsvp/*']
    },
    imageService: 'cloudflare',
    platformProxy: {
      enabled: true
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
      include: ['react', 'react-dom', 'nanostores', '@nanostores/react']
    },
    ssr: {
      noExternal: ['better-auth']
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
  },

  // Experimental features
  experimental: {
    contentLayer: true
  }
});
