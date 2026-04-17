import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Runtime aliases kept in sync with tsconfig.app.json -> compilerOptions.paths.
// If you add or rename an alias, update BOTH files or imports will break
// in either the type-checker (tsc) or the bundler (vite), not both.
const resolveSrc = (sub: string) =>
  fileURLToPath(new URL(`./src/${sub}`, import.meta.url));

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@components': resolveSrc('components'),
      '@pages': resolveSrc('pages'),
      '@layouts': resolveSrc('layouts'),
      '@hooks': resolveSrc('hooks'),
      '@services': resolveSrc('services'),
      '@store': resolveSrc('store'),
      '@providers': resolveSrc('providers'),
      '@utils': resolveSrc('utils'),
      '@constants': resolveSrc('constants'),
      '@assets': resolveSrc('assets'),
      '@style': resolveSrc('style'),
    },
  },
});
