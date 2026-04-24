import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(
  readFileSync(join(__dirname, 'package.json'), 'utf-8')
) as { version: string };
const v = process.env['VITE_APP_VERSION'] ?? pkg.version;

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(v),
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
});
