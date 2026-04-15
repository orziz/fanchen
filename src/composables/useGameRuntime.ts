import { nextTick, onMounted, ref } from "vue";

import { bootGameRuntime, resetGameRuntimeBoot, type RuntimeBootProgress } from "../runtime/bootstrap";

type BootStatus = "booting" | "ready" | "error";

export function useGameRuntime() {
  const status = ref<BootStatus>("booting");
  const progress = ref("准备装配源码运行时。");
  const detail = ref("新的 TS / Vue3 外壳已经渲染，接下来会直接启动统一模块运行时。");
  const errorMessage = ref("");

  function updateProgress(next: RuntimeBootProgress) {
    progress.value = next.label;
    detail.value = next.detail;
  }

  async function boot(forceReset = false) {
    status.value = "booting";
    progress.value = "准备装配源码运行时。";
    detail.value = "新的 TS / Vue3 外壳已经渲染，接下来会直接启动统一模块运行时。";
    errorMessage.value = "";

    if (forceReset) {
      resetGameRuntimeBoot();
    }

    await nextTick();

    try {
      await bootGameRuntime(updateProgress);
      status.value = "ready";
      progress.value = "源码运行时已经完成启动。";
      detail.value = "当前界面、状态、系统与主循环都来自同一套源码树和构建链。";
    } catch (error) {
      status.value = "error";
      errorMessage.value = error instanceof Error ? error.message : "源码运行时启动失败。";
      detail.value = "请检查 src/runtime 目录、启动入口和构建产物是否完整。";
    }
  }

  function retry() {
    void boot(true);
  }

  onMounted(() => {
    void boot();
  });

  return {
    detail,
    errorMessage,
    progress,
    retry,
    status,
  };
}
