import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  base: "./",
  plugins: [
    {
      name: "development-content-security-policy",
      apply: "serve",
      transformIndexHtml: (html) =>
        html
          .replace("script-src 'self'", "script-src 'self' 'unsafe-inline'")
          .replace("connect-src 'self'", "connect-src 'self' ws://127.0.0.1:5173"),
    },
    react(),
    tailwindcss(),
  ],
  server: { port: 5173, strictPort: true },
});
