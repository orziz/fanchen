(() => {
  const app = window.ShanHai;

  function render() {
    app.updateDerivedStats();
    app.renderTopBar();
    app.renderPlayerPanel();
    app.renderWorkbenchControls();
    app.renderProfileWindow();
    app.renderDockPanel();
    app.renderLocationDetail();
    app.renderInventoryPanel();
    app.renderIndustryPanel();
    app.renderMarketPanel();
    app.renderAuctionPanel();
    app.renderCombatPanel();
    app.renderNpcPanel();
    app.renderSectPanel();
    app.renderWorldPanel();
    app.renderLog();
    app.renderTabs();
    app.renderMap();
    app.renderFloatingWindows();
  }

  Object.assign(app, {
    render,
  });
})();