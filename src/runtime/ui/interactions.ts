(() => {
  const app = window.ShanHai;
  const { dom, state, runtime } = app;

  function bindDom() {
    dom.dayLabel = document.getElementById("dayLabel");
    dom.timeLabel = document.getElementById("timeLabel");
    dom.reputationLabel = document.getElementById("reputationLabel");
    dom.saveStateLabel = document.getElementById("saveStateLabel");
    dom.heroFocusLabel = document.getElementById("heroFocusLabel");
    dom.heroRouteLabel = document.getElementById("heroRouteLabel");
    dom.currentLocationLabel = document.getElementById("currentLocationLabel");
    dom.modeLabel = document.getElementById("modeLabel");
    dom.actionLabel = document.getElementById("actionLabel");
    dom.locationDetail = document.getElementById("locationDetail");
    dom.playerPanel = document.getElementById("playerPanel");
    dom.dockPanel = document.getElementById("dockPanel");
    dom.commandDetail = document.getElementById("commandDetail");
    dom.inventoryPanel = document.getElementById("inventoryPanel");
    dom.industryPanel = document.getElementById("industryPanel");
    dom.marketPanel = document.getElementById("marketPanel");
    dom.auctionPanel = document.getElementById("auctionPanel");
    dom.combatPanel = document.getElementById("combatPanel");
    dom.npcPanel = document.getElementById("npcPanel");
    dom.sectPanel = document.getElementById("sectPanel");
    dom.worldPanel = document.getElementById("worldPanel");
    dom.logList = document.getElementById("logList");
    dom.profileDetail = document.getElementById("profileDetail");
    dom.mapCanvasShell = document.getElementById("mapCanvasShell");
    dom.mapCanvas = document.getElementById("worldMap") as HTMLCanvasElement;
    dom.mapZoomLabel = document.getElementById("mapZoomLabel");
    dom.saveButton = document.getElementById("saveButton");
    dom.loadButton = document.getElementById("loadButton");
    dom.newGameButton = document.getElementById("newGameButton");
    dom.openJournalButton = document.getElementById("openJournalButton");
    dom.openMapButton = document.getElementById("openMapButton");
    dom.openCommandButton = document.getElementById("openCommandButton");
    dom.openProfileButton = document.getElementById("openProfileButton");
    dom.closeJournalButton = document.getElementById("closeJournalButton");
    dom.closeMapButton = document.getElementById("closeMapButton");
    dom.closeCommandButton = document.getElementById("closeCommandButton");
    dom.closeProfileButton = document.getElementById("closeProfileButton");
    dom.journalWindow = document.getElementById("journalWindow");
    dom.mapWindow = document.getElementById("mapWindow");
    dom.commandWindow = document.getElementById("commandWindow");
    dom.profileWindow = document.getElementById("profileWindow");
    dom.speedSwitch = document.getElementById("speedSwitch");
    dom.focusPlayerButton = document.getElementById("focusPlayerButton");
    dom.clearLogButton = document.getElementById("clearLogButton");
    dom.tabStrip = document.getElementById("tabStrip");
    dom.toastStack = document.getElementById("toastStack");
  }

  function bindEvents() {
    if (runtime.interactionsBound) return;
    runtime.interactionsBound = true;
    app.bindWindowEvents?.();

    dom.saveButton.addEventListener("click", () => app.saveGame(true));
    dom.loadButton.addEventListener("click", app.loadGame);
    dom.newGameButton.addEventListener("click", () => {
      if (window.confirm("确认重开此世？当前未存档进度会被覆盖。")) {
        app.resetGame();
      }
    });

    document.addEventListener("click", (event) => {
      app.handleBlockedControl(event);
    }, true);
    document.addEventListener("click", (event) => {
      const openButton = app.getClosest(event.target, "[data-open-window]");
      if (openButton) {
        event.preventDefault();
        app.toggleWindow(openButton.dataset.openWindow);
        return;
      }
      const closeButton = app.getClosest(event.target, "[data-close-window]");
      if (closeButton) {
        event.preventDefault();
        app.closeWindow(closeButton.dataset.closeWindow);
        return;
      }
      const minimizeButton = app.getClosest(event.target, "[data-window-action=\"minimize\"]");
      if (minimizeButton) {
        event.preventDefault();
        app.toggleWindowMinimize(minimizeButton.dataset.windowId);
        return;
      }
      const dockButton = app.getClosest(event.target, "[data-window-action=\"dock\"]");
      if (dockButton) {
        event.preventDefault();
        app.toggleWindowDock(dockButton.dataset.windowId);
      }
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        app.closeTopWindow?.();
      }
    });

    dom.speedSwitch.addEventListener("click", (event) => {
      const target = app.getClosest(event.target, "[data-speed]");
      if (!target) return;
      state.speed = Number(target.dataset.speed);
      app.renderSpeedButtons();
    });

    dom.focusPlayerButton.addEventListener("click", () => {
      app.showLocationOnMap(app.getGame().player.locationId);
    });

    dom.clearLogButton.addEventListener("click", () => {
      app.getGame().log = [];
      app.renderLog();
    });

    dom.tabStrip.addEventListener("click", (event) => {
      const target = app.getClosest(event.target, "[data-tab]");
      if (!target) return;
      state.selectedTab = target.dataset.tab;
      app.renderTabs();
    });

    [dom.mapWindow, dom.journalWindow, dom.profileWindow, dom.commandWindow].forEach((element) => {
      if (!element) return;
      element.addEventListener("pointerdown", () => app.bringWindowToFront(element.dataset.window));
    });

    document.querySelectorAll<HTMLElement>("[data-window-handle]").forEach((handle) => {
      const onDragStart = (event) => {
        if (app.getClosest(event.target, "button")) return;
        app.startWindowDrag(handle.dataset.windowHandle, event);
      };
      handle.addEventListener("pointerdown", onDragStart);
      handle.addEventListener("mousedown", onDragStart);
    });

    document.querySelectorAll<HTMLElement>(".window-actions button").forEach((button) => {
      const stopHeaderDrag = (event) => {
        event.stopPropagation();
      };
      button.addEventListener("pointerdown", stopHeaderDrag);
      button.addEventListener("mousedown", stopHeaderDrag);
    });

    dom.mapCanvas.addEventListener("click", app.onCanvasClick);
    dom.mapCanvas.addEventListener("pointerdown", app.onCanvasPointerDown);
    dom.mapCanvas.addEventListener("mousedown", app.onCanvasPointerDown);
    dom.mapCanvas.addEventListener("pointercancel", app.stopCanvasPointer);
    dom.mapCanvas.addEventListener("wheel", app.onCanvasWheel, { passive: false });
    document.addEventListener("pointermove", app.onCanvasPointerMove);
    document.addEventListener("pointerup", app.stopCanvasPointer);
    document.addEventListener("mousemove", app.onCanvasPointerMove);
    document.addEventListener("mouseup", app.stopCanvasPointer);
    dom.mapWindow.addEventListener("click", app.handleMapWindowClick);
    dom.locationDetail.addEventListener("click", app.handleLocationDetailClick);
    dom.playerPanel.addEventListener("click", app.handlePlayerPanelClick);
    dom.commandDetail.addEventListener("click", app.handlePlayerPanelClick);
    dom.inventoryPanel.addEventListener("click", app.handleInventoryClick);
    dom.marketPanel.addEventListener("click", app.handleMarketClick);
    dom.industryPanel.addEventListener("click", app.handleIndustryClick);
    dom.auctionPanel.addEventListener("click", app.handleAuctionClick);
    dom.combatPanel.addEventListener("click", app.handleCombatClick);
    dom.npcPanel.addEventListener("click", app.handleNpcClick);
    dom.sectPanel.addEventListener("click", app.handleSectClick);
    dom.worldPanel.addEventListener("click", app.handleWorldClick);
    dom.dockPanel.addEventListener("click", app.handleDockClick);
  }

  Object.assign(app, {
    bindDom,
    bindEvents,
  });
})();
