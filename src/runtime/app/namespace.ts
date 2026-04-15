(() => {
  const app = (window.ShanHai || ({} as ShanHaiApp)) as ShanHaiApp;

  app.config = app.config || ({} as ShanHaiRuntimeConfig);
  app.tables = app.tables || ({} as ShanHaiRuntimeTables);
  app.utils = app.utils || ({} as ShanHaiRuntimeUtils);
  app.dom = app.dom || ({} as ShanHaiDomRefs);
  app.socialInternals = app.socialInternals || ({} as ShanHaiSocialInternals);
  app.industryInternals = app.industryInternals || ({} as ShanHaiIndustryInternals);
  app.PLAYER_FACTION_BRANCHES = app.PLAYER_FACTION_BRANCHES || {};
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
    initialized: false,
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