import { writeFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";

const distDir = resolve("dist");

function createIndexHtml(cssFile?: string) {
  const cssLink = cssFile ? `\n  <link rel="stylesheet" href="./assets/${cssFile}">` : '';
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>凡尘立道录</title>${cssLink}
</head>
<body>
  <div id="app"></div>
  <noscript>凡尘立道录需要启用 JavaScript 才能运行。</noscript>
  <script src="./assets/app.js"></script>
</body>
</html>
`;
}

function fanchenFileBuildPlugin() {
  return {
    name: "fanchen-file-build-plugin",
    apply: "build" as const,
    closeBundle() {
      const assetsDir = resolve(distDir, "assets");
      const cssFile = readdirSync(assetsDir).find(f => f.endsWith(".css"));
      writeFileSync(resolve(distDir, "index.html"), createIndexHtml(cssFile), "utf8");
    },
  };
}

export default defineConfig({
  plugins: [vue(), fanchenFileBuildPlugin()],
  publicDir: false,
  resolve: {
    alias: {
      "@": resolve("src"),
    },
  },
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
    __VUE_OPTIONS_API__: true,
    __VUE_PROD_DEVTOOLS__: false,
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: true,
    cssCodeSplit: false,
    lib: {
      entry: resolve("src/main.ts"),
      formats: ["iife"],
      name: "FanChenApp",
      fileName: () => "app",
    },
    rollupOptions: {
      output: {
        entryFileNames: "assets/app.js",
        assetFileNames: "assets/[name].[ext]",
      },
    },
  },
});
