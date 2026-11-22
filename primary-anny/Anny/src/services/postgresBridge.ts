/**
 * ANNY — SERVER-ONLY POSTGRESQL BOUNDARY BRIDGE
 * Keeps Node-only PostgreSQL drivers (`pg` inside `postgresPlatform.ts`) out of
 * browser bundles while preserving live Postgres persistence in Node.js server
 * and CLI execution contexts.
 */

import type { PostgresPlatform } from './postgresPlatform';

let serverPostgresInstance: PostgresPlatform | null = null;
let loadPromise: Promise<PostgresPlatform | null> | null = null;

export function registerServerPostgresPlatform(instance: PostgresPlatform): void {
  if (typeof window === 'undefined') {
    serverPostgresInstance = instance;
  }
}

export async function getServerPostgresPlatform(): Promise<PostgresPlatform | null> {
  if (typeof window !== 'undefined') {
    return null;
  }

  if (serverPostgresInstance) {
    return serverPostgresInstance;
  }

  if (!loadPromise) {
    loadPromise = (async () => {
      try {
        const modPath = './' + 'postgresPlatform';
        const modTsPath = modPath + '.ts';
        let mod: { postgresPlatform?: PostgresPlatform } | null = null;
        try {
          mod = await import(/* @vite-ignore */ modPath);
        } catch {
          mod = await import(/* @vite-ignore */ modTsPath);
        }
        if (mod?.postgresPlatform) {
          serverPostgresInstance = mod.postgresPlatform;
          return mod.postgresPlatform;
        }
      } catch (err: any) {
        console.warn('[PostgresBridge] Server PostgreSQL module unavailable:', err?.message || err);
      }
      return serverPostgresInstance;
    })();
  }

  return loadPromise;
}
