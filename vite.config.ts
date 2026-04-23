import { copyFileSync, existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import vue from "@vitejs/plugin-vue";
import { defineConfig, type ViteDevServer } from "vite";

import { serializeItemFile } from "./src/tools/shared/itemFile";
import { serializeStoryFile } from "./src/tools/shared/storyFile";
import { serializeWorldFile } from "./src/tools/shared/worldFile";

const distDir = resolve("dist");
const publicAssetsDir = resolve("public", "assets");

function copyDirContents(sourceDir: string, targetDir: string) {
  mkdirSync(targetDir, { recursive: true });

  for (const entry of readdirSync(sourceDir, { withFileTypes: true })) {
    const sourcePath = resolve(sourceDir, entry.name);
    const targetPath = resolve(targetDir, entry.name);

    if (entry.isDirectory()) {
      copyDirContents(sourcePath, targetPath);
      continue;
    }

    copyFileSync(sourcePath, targetPath);
  }
}

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

      if (existsSync(publicAssetsDir)) {
        copyDirContents(publicAssetsDir, assetsDir);
      }

      const cssFile = readdirSync(assetsDir).find(f => f.endsWith(".css"));
      writeFileSync(resolve(distDir, "index.html"), createIndexHtml(cssFile), "utf8");
    },
  };
}

function fanchenToolsPlugin() {
  function readRequestBody(req: ViteDevServer["middlewares"] extends { use: (...args: infer T) => unknown } ? T[0] : never) {
    return new Promise<string>((resolveBody, rejectBody) => {
      let body = "";
      req.on("data", chunk => {
        body += chunk;
      });
      req.on("end", () => resolveBody(body));
      req.on("error", rejectBody);
    });
  }

  function sendJson(res: Parameters<ViteDevServer["middlewares"]["use"]>[1], statusCode: number, payload: Record<string, unknown>) {
    res.statusCode = statusCode;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify(payload));
  }

  return {
    name: "fanchen-tools-plugin",
    apply: "serve" as const,
    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url || "/", "http://localhost");
        const isSaveWorld = url.pathname === "/__tools/save-world";
        const isSaveItems = url.pathname === "/__tools/save-items";
        const isSaveStories = url.pathname === "/__tools/save-stories";

        if (!isSaveWorld && !isSaveItems && !isSaveStories) {
          next();
          return;
        }

        if (req.method !== "POST") {
          sendJson(res, 405, { ok: false, error: "method_not_allowed" });
          return;
        }

        try {
          const payload = JSON.parse((await readRequestBody(req)) || "{}");

          if (isSaveWorld) {
            if (!Array.isArray(payload.locations)) throw new Error("invalid_locations_payload");
            writeFileSync(resolve("src/config/world.ts"), serializeWorldFile(payload.locations), "utf8");
            sendJson(res, 200, { ok: true, count: payload.locations.length });
            return;
          }

          if (isSaveStories) {
            if (!Array.isArray(payload.stories)) throw new Error("invalid_stories_payload");
            writeFileSync(resolve("src/config/story.ts"), serializeStoryFile(payload.stories), "utf8");
            sendJson(res, 200, { ok: true, count: payload.stories.length });
            return;
          }

          if (!Array.isArray(payload.items)) throw new Error("invalid_items_payload");
          writeFileSync(resolve("src/config/items.ts"), serializeItemFile(payload.items), "utf8");
          sendJson(res, 200, { ok: true, count: payload.items.length });
        } catch (error) {
          sendJson(res, 400, { ok: false, error: error instanceof Error ? error.message : "save_failed" });
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [vue(), fanchenFileBuildPlugin(), fanchenToolsPlugin()],
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
