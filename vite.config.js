import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'node:path';

// Application multi-pages : une entrée HTML par écran.
const pages = ['index', 'dossier'];

export default defineConfig({
  plugins: [tailwindcss()],
  build: {
    rollupOptions: {
      input: Object.fromEntries(pages.map((p) => [p, resolve(import.meta.dirname, `${p}.html`)])),
    },
  },
  server: {
    proxy: { '/api': 'http://localhost:3001' },
  },
});
