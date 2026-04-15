import "./app/namespace";
import "./app/utils";
import "./config/constants";
import "./config/world";
import "./config/items";
import "./config/npcs";
import "./config/economy";
import "./config/combat";
import "./config/events";
import "./systems/state";
import "./systems/state-factories";
import "./systems/state-hydration";
import "./systems/state-accessors";
import "./systems/player";
import "./systems/combat";
import "./systems/social";
import "./systems/social-core";
import "./systems/social-territory";
import "./systems/social-affiliation";
import "./systems/social-player-faction";
import "./systems/social-sect";
import "./systems/social-relationships";
import "./systems/world-trade";
import "./systems/world-auction";
import "./systems/world-npcs";
import "./systems/world";
import "./systems/industry-core";
import "./systems/industry-orders";
import "./systems/industry-operations";
import "./systems/industry";
import "./ui/shared";
import "./ui/windows";
import "./ui/interactions-core";
import "./ui/interactions-panels";
import "./ui/interactions-map";
import "./ui/interactions";
import "./ui/panels/layout";
import "./ui/panels/exploration";
import "./ui/panels/commerce";
import "./ui/panels/social";
import "./ui/map";
import "./ui/main";
import "./game";

export interface RuntimeBootProgress {
  detail: string;
  label: string;
  stage: "prepare" | "initialize" | "ready";
}

let bootPromise: Promise<ShanHaiApp> | null = null;

function getRuntimeApp() {
  const app = window.ShanHai;
  if (!app?.initialize) {
    throw new Error("源码运行时入口未装配完整。请检查 src/runtime 下的模块清单。");
  }
  return app;
}

export async function bootGameRuntime(onProgress?: (progress: RuntimeBootProgress) => void) {
  const app = getRuntimeApp();
  if (app.runtime?.initialized) {
    return app;
  }
  if (bootPromise) {
    return bootPromise;
  }

  bootPromise = Promise.resolve().then(() => {
    onProgress?.({
      detail: "Vue 页面骨架已经挂载完成。",
      label: "正在装配统一运行时",
      stage: "prepare",
    });

    onProgress?.({
      detail: "状态、系统、界面与自动存档将从同一模块图启动。",
      label: "正在进入主循环",
      stage: "initialize",
    });

    app.initialize?.();

    onProgress?.({
      detail: "当前界面和玩法共享同一套源码与构建入口。",
      label: "运行时启动完成",
      stage: "ready",
    });

    return app;
  }).catch((error) => {
    if (app.runtime) {
      app.runtime.initialized = false;
    }
    bootPromise = null;
    throw error;
  });

  return bootPromise;
}

export function resetGameRuntimeBoot() {
  bootPromise = null;
  if (window.ShanHai?.runtime) {
    window.ShanHai.runtime.initialized = false;
  }
}