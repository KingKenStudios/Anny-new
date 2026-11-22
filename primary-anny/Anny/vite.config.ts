import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import {defineConfig, loadEnv} from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// SECURITY: never spread the full process.env into `define` — that bakes every
// server secret (DB passwords, JWT secrets, Stripe secret key, admin password, ...)
// into the public client JS bundle. Only explicitly-allowlisted, client-safe
// values are exposed here. Anything a component needs from the server belongs
// behind an API call to server.ts, not in the client bundle.
const CLIENT_SAFE_ENV_KEYS = [
  'APP_NAME',
  'APP_URL',
  'VITE_STRIPE_PUBLIC_KEY',
  'VITE_USER_ONLY_MODE',
] as const;

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  const clientSafeEnv = Object.fromEntries(
    CLIENT_SAFE_ENV_KEYS
      .filter((key) => env[key] !== undefined)
      .map((key) => [key, env[key]])
  );
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env': clientSafeEnv,
      'global': 'globalThis',
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      sourcemap: false,
      reportCompressedSize: false,
      minify: false,
      target: 'esnext',
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
      dedupe: ['react', 'react-dom'],
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
