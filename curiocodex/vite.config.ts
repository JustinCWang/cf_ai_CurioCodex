/**
 * Vite configuration for building React frontend and Cloudflare Worker backend.
 * Provides HMR during development and bundles both for production.
 */

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig(({ mode, command }) => ({
  plugins: [
    react(),
    cloudflare({
      // Use dev config for local development (without Vectorize to avoid Windows issues)
      // Use production config (wrangler.json) for builds and production mode
      configPath: mode === "development" && command === "serve" 
        ? "./wrangler.dev.json" 
        : "./wrangler.json",
    }),
  ],
}));
