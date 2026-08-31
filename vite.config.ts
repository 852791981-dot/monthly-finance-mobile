import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { sites } from "@openai/sites-vite-plugin";
export default defineConfig({
  base: "/monthly-finance-mobile/",
  plugins: [
    sites(),
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: [],
      workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
      },
      manifest: {
        name: "月度财务",
        short_name: "月度财务",
        theme_color: "#8f1d18",
        background_color: "#fbf5ef",
        display: "standalone",
        icons: [{ src: "icon.svg", sizes: "any", type: "image/svg+xml" }],
      },
    }),
  ],
  test: { environment: "jsdom" },
});
