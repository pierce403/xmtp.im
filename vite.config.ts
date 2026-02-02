import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    // XMTP Browser SDK uses module web workers which can break when the dep
    // optimizer pre-bundles the package.
    exclude: ["@xmtp/browser-sdk"],
  },
});
