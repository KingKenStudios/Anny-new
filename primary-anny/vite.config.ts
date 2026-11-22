import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

const CLIENT_SAFE_ENV_KEYS = [
  'APP_NAME',
  'APP_URL',
  'VITE_STRIPE_PUBLIC_KEY',
  'VITE_USER_ONLY_MODE',
] as const;

export default defineConfig(({mode}) => {
  const env = loadEnv(mode || 'development', '.', '');
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
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
