(() => {
  const app = window.ShanHai;
  const { config, state, runtime, utils } = app;

  function loop(timestamp) {
    if (!app.getGame()) return;
    if (!state.lastLoopTime) state.lastLoopTime = timestamp;
    const delta = timestamp - state.lastLoopTime;
    const interval = config.LOOP_INTERVALS[state.speed] || config.LOOP_INTERVALS[1] || 3400;
    if (delta >= interval) {
      state.lastLoopTime = timestamp;
      app.gameStep();
    }
    runtime.loopHandle = window.requestAnimationFrame(loop);
  }

  function startLoop() {
    if (runtime.loopHandle) {
      window.cancelAnimationFrame(runtime.loopHandle);
    }
    state.lastLoopTime = 0;
    runtime.loopHandle = window.requestAnimationFrame(loop);
  }

  function startAutoSave() {
    window.clearInterval(runtime.autoSaveHandle);
    runtime.autoSaveHandle = window.setInterval(() => app.saveGame(false), config.AUTO_SAVE_INTERVAL);
  }

  function initialize() {
    if (runtime.initialized) {
      app.render();
      return;
    }

    app.bindDom();
    app.bindEvents();

    const raw = localStorage.getItem(config.SAVE_KEY);
    if (raw) {
      try {
        app.setGame(app.hydrateGameState(JSON.parse(raw)));
        state.saveState = "已载入本地存档";
      } catch (error) {
        app.setGame(app.createGameState());
        state.saveState = "旧存档损坏，已重置";
      }
    } else {
      app.setGame(app.createGameState());
      state.saveState = "未存档";
    }

    app.updateDerivedStats();
    runtime.mapTexture = utils.buildMapTexture();
    state.selectedLocationId = app.getGame().player.locationId;

    app.appendLog("凡尘立道录已开启，你的寒门修途开始运转。", "info");
    runtime.initialized = true;
    app.render();
    startLoop();
    startAutoSave();
  }

  Object.assign(app, {
    loop,
    startLoop,
    startAutoSave,
    initialize,
  });
})();