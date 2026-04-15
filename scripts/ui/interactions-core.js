(() => {
  const app = window.ShanHai;
  const { state } = app;

  function getClosest(target, selector) {
    if (target instanceof Element) return target.closest(selector);
    if (target && target.parentElement instanceof Element) return target.parentElement.closest(selector);
    return null;
  }

  function handleBlockedControl(event) {
    const blocked = getClosest(event.target, "[aria-disabled=\"true\"][data-disabled-reason]");
    if (!blocked) return false;
    event.preventDefault();
    event.stopPropagation();
    app.showFeedback(blocked.dataset.disabledReason || "当前条件不足，暂时无法执行。", "warn");
    return true;
  }

  function showLocationOnMap(locationId) {
    state.selectedLocationId = locationId;
    app.openWindow("map");
    app.renderLocationDetail();
    app.focusMapOnLocation?.(locationId, { preserveScale: true });
  }

  function travelOnly(locationId) {
    const before = app.getGame().player.locationId;
    app.travelTo(locationId);
    if (before !== app.getGame().player.locationId) {
      app.tickWorld();
      app.render();
    }
  }

  function runQuickAction(action) {
    if (action === "rest") {
      app.adjustResource("hp", 18, "maxHp");
      app.adjustResource("qi", 16, "maxQi");
      app.adjustResource("stamina", 20, "maxStamina");
      app.appendLog("你暂时收束心神，运气回息。", "info");
      app.render();
      return true;
    }

    if (action === "create-sect") {
      app.createSect();
      app.render();
      return true;
    }

    if (action === "affiliation") {
      state.selectedTab = "sect";
      app.renderTabs();
      return true;
    }

    app.forceAction(action);
    return true;
  }

  Object.assign(app, {
    getClosest,
    handleBlockedControl,
    showLocationOnMap,
    travelOnly,
    runQuickAction,
  });
})();