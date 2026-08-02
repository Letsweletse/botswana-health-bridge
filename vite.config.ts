import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(() => ({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.png", "app-icon.png", "icon-192.png", "icon-512.png"],
      workbox: {
        navigateFallbackDenylist: [/^\/~oauth/],
        globPatterns: ["**/*.{js,css,html,ico,png,svg,jpg,jpeg,woff,woff2}"],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/kcgsxxwgzrmsnnxvpkvi\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-cache',
              networkTimeoutSeconds: 10,
            },
          },
        ],
      },
      manifest: {
        name: "ChekaMeds — Find Medicine Near You",
        short_name: "ChekaMeds",
        description: "Find medicine availability across pharmacies in Botswana. Search, reserve, and get directions instantly.",
        theme_color: "#10b981",
        background_color: "#050d18",
        display: "standalone",
        orientation: "portrait-primary",
        scope: "/",
        start_url: "/search",
        categories: ["health", "medical"],
        icons: [
          {
            src: "/icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/icon-512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
        screenshots: [
          {
            src: "/chekameds-logo.png",
            sizes: "1200x630",
            type: "image/png",
            form_factor: "wide",
            label: "ChekaMeds — Find Medicine Near You",
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
