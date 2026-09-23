import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import { DEV_API_PORT } from "./shared/constants.ts";

const AUTH0_BUILD_ENV = ["VITE_AUTH0_DOMAIN", "VITE_AUTH0_CLIENT_ID", "VITE_AUTH0_AUDIENCE"];

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // A deployed build without Auth0 settings would ship an app nobody can sign in to: refuse it.
  if (process.env.VERCEL) {
    const env = loadEnv(mode, process.cwd(), "VITE_");
    const missing = AUTH0_BUILD_ENV.filter((name) => !env[name]);
    if (missing.length) {
      throw new Error(`Missing ${missing.join(", ")}. Set them in Vercel → Project → Settings → Environment Variables, then redeploy.`);
    }
  }

  return {
    plugins: [
      // Must come before the React plugin.
      tanstackRouter({ target: "react", autoCodeSplitting: true }),
      react(),
      tailwindcss(),
    ],
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
        "@shared": fileURLToPath(new URL("./shared", import.meta.url)),
      },
    },
    server: {
      port: 5173,
      strictPort: true,
      proxy: {
        "/api": `http://127.0.0.1:${DEV_API_PORT}`,
      },
    },
  };
});
