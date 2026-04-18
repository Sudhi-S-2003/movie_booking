import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Runtime aliases kept in sync with tsconfig.app.json -> compilerOptions.paths.
// If you add or rename an alias, update BOTH files or imports will break
// in either the type-checker (tsc) or the bundler (vite), not both.
const resolveSrc = (sub: string) =>
  fileURLToPath(new URL(`./src/${sub}`, import.meta.url));

// ─────────────────────────────────────────────────────────────────────────────
// Iframe embedding policy.
//
// The SPA has ONE iframe-embeddable route: `/chat/:id?signature=…&expiresAt=…`
// (the signed-URL guest chat). Every other route — home page, admin/owner/user
// dashboards, auth pages, etc. — must refuse embedding, both to prevent
// clickjacking of authenticated actions and to stop a third-party page from
// inlining our branding.
//
// Strategy:
//   • Default response → `frame-ancestors 'none'` + `X-Frame-Options: DENY`
//   • The signed-chat path only → `frame-ancestors http: https:` (permissive)
//
// Why explicit schemes instead of `*`? Chrome's CSP parser only expands `*`
// to the network schemes (`http` / `https` / `ws` / `wss`) PLUS self's
// scheme — so an http-served iframe embedded in an http parent otherwise
// triggers: "'*' matches only URLs with network schemes … the scheme
// 'http:' must be added explicitly." Listing both schemes sidesteps that.
//
// In production your static host (Nginx, Cloudflare, S3+CF, etc.) should
// mirror this policy — conditional on path for index.html responses.
// ─────────────────────────────────────────────────────────────────────────────
const isSignedChatPath = (url: string | undefined): boolean => {
  if (!url) return false;
  // url here is the req.url from Node — already starts with '/' and has the
  // query string attached, e.g. "/chat/abc123?signature=…&expiresAt=…".
  const qIdx = url.indexOf('?');
  const path = qIdx === -1 ? url : url.slice(0, qIdx);
  if (!path.startsWith('/chat/')) return false;
  const query = qIdx === -1 ? '' : url.slice(qIdx + 1);
  return new URLSearchParams(query).has('signature');
};

const applyFramePolicy = (req: { url?: string }, res: { setHeader: (k: string, v: string) => void }) => {
  if (isSignedChatPath(req.url)) {
    res.setHeader('Content-Security-Policy', 'frame-ancestors http: https:;');
    // X-Frame-Options has no "ALLOW-ALL" equivalent; just omit it so modern
    // browsers fall back to the CSP directive above.
  } else {
    res.setHeader('Content-Security-Policy', "frame-ancestors 'none';");
    res.setHeader('X-Frame-Options', 'DENY');
  }
};

const framePolicyPlugin = () => ({
  name:             'per-route-frame-policy',
  configureServer(server: { middlewares: { use: (fn: (req: { url?: string }, res: { setHeader: (k: string, v: string) => void }, next: () => void) => void) => void } }) {
    server.middlewares.use((req, res, next) => {
      applyFramePolicy(req, res);
      next();
    });
  },
  configurePreviewServer(server: { middlewares: { use: (fn: (req: { url?: string }, res: { setHeader: (k: string, v: string) => void }, next: () => void) => void) => void } }) {
    server.middlewares.use((req, res, next) => {
      applyFramePolicy(req, res);
      next();
    });
  },
});

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), framePolicyPlugin()],
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
