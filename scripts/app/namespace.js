(() => {
  const app = window.ShanHai || {};

  app.config = app.config || {};
  app.tables = app.tables || {};
  app.utils = app.utils || {};
  app.dom = app.dom || {};
  app.state = app.state || {
    speed: 1,
    lastLoopTime: 0,
    saveState: "未存档",
    selectedLocationId: "qinghe",
    selectedTab: "inventory",
    windows: {},
    windowZCounter: 3,
  };
  app.runtime = app.runtime || {
    game: null,
    loopHandle: 0,
    autoSaveHandle: 0,
    mapTexture: null,
    mapViewport: null,
    mapInteraction: null,
    mapIgnoreClick: false,
    battleFlash: 0,
    activeWindowDrag: null,
    windowEventsBound: false,
    windowLayoutLoaded: false,
    interactionsBound: false,
  };

  window.ShanHai = app;
})();