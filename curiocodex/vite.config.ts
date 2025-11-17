/**
 * Vite configuration for building React frontend and Cloudflare Worker backend.
 * Provides HMR during development and bundles both for production.
 */

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig({
  plugins: [react(), cloudflare()],
});
