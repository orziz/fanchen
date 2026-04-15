(() => {
  const app = window.ShanHai;
  const { tables, dom, runtime, utils } = app;
  const { LOCATIONS, LOCATION_MAP } = tables;
  const { clamp } = utils;
  const VIEW_MARGIN_X = 132;
  const VIEW_MARGIN_Y = 108;
  const MIN_SCALE = 0.72;
  const MAX_SCALE = 1.92;
  const PAN_PADDING = 54;

  function getCanvasMetrics() {
    const canvas = dom.mapCanvas;
    return {
      width: canvas?.width || 1440,
      height: canvas?.height || 720,
    };
  }

  function getViewportBounds() {
    return LOCATIONS.reduce((bounds, location) => ({
      minX: Math.min(bounds.minX, location.x),
      maxX: Math.max(bounds.maxX, location.x),
      minY: Math.min(bounds.minY, location.y),
      maxY: Math.max(bounds.maxY, location.y),
    }), {
      minX: Number.POSITIVE_INFINITY,
      maxX: Number.NEGATIVE_INFINITY,
      minY: Number.POSITIVE_INFINITY,
      maxY: Number.NEGATIVE_INFINITY,
    });
  }

  function clampViewport(viewport) {
    const { width, height } = getCanvasMetrics();
    const scaledWidth = width * viewport.scale;
    const scaledHeight = height * viewport.scale;

    if (scaledWidth <= width) {
      viewport.offsetX = (width - scaledWidth) / 2;
    } else {
      viewport.offsetX = clamp(viewport.offsetX, width - scaledWidth - PAN_PADDING, PAN_PADDING);
    }

    if (scaledHeight <= height) {
      viewport.offsetY = (height - scaledHeight) / 2;
    } else {
      viewport.offsetY = clamp(viewport.offsetY, height - scaledHeight - PAN_PADDING, PAN_PADDING);
    }

    return viewport;
  }

  function getDefaultViewport() {
    const { width, height } = getCanvasMetrics();
    const bounds = getViewportBounds();
    const contentWidth = bounds.maxX - bounds.minX + VIEW_MARGIN_X * 2;
    const contentHeight = bounds.maxY - bounds.minY + VIEW_MARGIN_Y * 2;
    const fitScale = clamp(Math.min(width / contentWidth, height / contentHeight), MIN_SCALE, 1);
    const viewport = {
      scale: fitScale,
      minScale: MIN_SCALE,
      maxScale: MAX_SCALE,
      offsetX: (width - contentWidth * fitScale) / 2 - (bounds.minX - VIEW_MARGIN_X) * fitScale,
      offsetY: (height - contentHeight * fitScale) / 2 - (bounds.minY - VIEW_MARGIN_Y) * fitScale,
    };
    return clampViewport(viewport);
  }

  function ensureMapViewport() {
    if (!runtime.mapViewport) {
      runtime.mapViewport = getDefaultViewport();
    }
    runtime.mapViewport.minScale = MIN_SCALE;
    runtime.mapViewport.maxScale = MAX_SCALE;
    return clampViewport(runtime.mapViewport);
  }

  function syncMapZoomLabel() {
    if (!dom.mapZoomLabel) return;
    dom.mapZoomLabel.textContent = `${Math.round(ensureMapViewport().scale * 100)}%`;
  }

  function drawWorldBackdrop(context, width, height) {
    const gradient = context.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, "#35504a");
    gradient.addColorStop(0.4, "#203a34");
    gradient.addColorStop(1, "#0d1714");
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);
  }

  function drawMapTexture(context) {
    if (!runtime.mapTexture) {
      runtime.mapTexture = app.utils.buildMapTexture();
    }

    context.save();
    context.globalAlpha = 0.16;
    runtime.mapTexture.glows.forEach((spot) => {
      const gradient = context.createRadialGradient(spot.x, spot.y, spot.radius * 0.1, spot.x, spot.y, spot.radius);
      gradient.addColorStop(0, "rgba(242,214,162,0.35)");
      gradient.addColorStop(1, "rgba(242,214,162,0)");
      context.fillStyle = gradient;
      context.beginPath();
      context.arc(spot.x, spot.y, spot.radius, 0, Math.PI * 2);
      context.fill();
    });

    context.globalAlpha = 0.1;
    runtime.mapTexture.strokes.forEach((stroke) => {
      context.beginPath();
      context.moveTo(stroke.x, stroke.y);
      context.quadraticCurveTo(stroke.x + stroke.cpX, stroke.y + stroke.cpY, stroke.x + stroke.endX, stroke.y + stroke.endY);
      context.strokeStyle = "rgba(255,255,255,0.2)";
      context.lineWidth = stroke.width;
      context.stroke();
    });
    context.restore();
  }

  function drawRoutes(context) {
    context.save();
    LOCATIONS.forEach((location) => {
      location.neighbors.forEach((neighborId) => {
        if (location.id > neighborId) return;
        const target = LOCATION_MAP[neighborId];
        context.beginPath();
        context.moveTo(location.x, location.y);
        const midX = (location.x + target.x) / 2 + (target.y - location.y) * 0.08;
        const midY = (location.y + target.y) / 2 - (target.x - location.x) * 0.05;
        context.quadraticCurveTo(midX, midY, target.x, target.y);
        context.strokeStyle = "rgba(242, 214, 162, 0.26)";
        context.lineWidth = 2;
        context.stroke();
      });
    });
    context.restore();
  }

  function drawLocationNodes(context, selected, current, activeRealmId) {
    LOCATIONS.forEach((location) => {
      const isSelected = selected.id === location.id;
      const isCurrent = current.id === location.id;
      const isRealmHot = location.realmId && location.realmId === activeRealmId;
      const radius = isCurrent ? 18 : isSelected ? 15 : 12;

      context.save();
      const glow = context.createRadialGradient(location.x, location.y, 0, location.x, location.y, radius * 2.8);
      glow.addColorStop(0, isRealmHot ? "rgba(180,92,71,0.58)" : isCurrent ? "rgba(127,178,148,0.65)" : isSelected ? "rgba(242,214,162,0.55)" : "rgba(125,178,200,0.34)");
      glow.addColorStop(1, "rgba(0,0,0,0)");
      context.fillStyle = glow;
      context.beginPath();
      context.arc(location.x, location.y, radius * 2.8, 0, Math.PI * 2);
      context.fill();

      context.beginPath();
      context.fillStyle = isRealmHot ? "#b45c47" : isCurrent ? "#7fb294" : isSelected ? "#f2d6a2" : "#7db2c8";
      context.arc(location.x, location.y, radius, 0, Math.PI * 2);
      context.fill();
      context.lineWidth = 2.5;
      context.strokeStyle = "rgba(255,255,255,0.6)";
      context.stroke();

      context.fillStyle = "rgba(250, 243, 228, 0.9)";
      context.font = isCurrent ? "700 20px STKaiti" : "600 16px STKaiti";
      context.textAlign = "center";
      context.fillText(location.short, location.x, location.y - radius - 12);
      context.restore();
    });
  }

  function drawPlayerTrail(context, current) {
    context.save();
    context.strokeStyle = "rgba(127,178,148,0.7)";
    context.setLineDash([8, 8]);
    context.lineWidth = 2;
    context.beginPath();
    context.arc(current.x, current.y, 34, 0, Math.PI * 2);
    context.stroke();
    context.restore();
  }

  function canvasPointToWorld(canvasX, canvasY) {
    const viewport = ensureMapViewport();
    return {
      x: (canvasX - viewport.offsetX) / viewport.scale,
      y: (canvasY - viewport.offsetY) / viewport.scale,
    };
  }

  function getCanvasPointFromEvent(event) {
    const canvas = dom.mapCanvas;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  function getWorldPointFromEvent(event) {
    const point = getCanvasPointFromEvent(event);
    return point ? canvasPointToWorld(point.x, point.y) : null;
  }

  function centerMapOn(locationId, options: ShanHaiMapFocusOptions = {}) {
    const location = LOCATION_MAP[locationId];
    if (!location) return;
    const viewport = ensureMapViewport();
    const { width, height } = getCanvasMetrics();
    const scale = clamp(options.scale ?? viewport.scale, viewport.minScale, viewport.maxScale);
    viewport.scale = scale;
    viewport.offsetX = width / 2 - location.x * scale;
    viewport.offsetY = height / 2 - location.y * scale;
    clampViewport(viewport);
    syncMapZoomLabel();
    if (options.render !== false) {
      renderMap();
    }
  }

  function resetMapViewport() {
    runtime.mapViewport = getDefaultViewport();
    syncMapZoomLabel();
    renderMap();
  }

  function zoomMap(factor, anchorX, anchorY) {
    const viewport = ensureMapViewport();
    const { width, height } = getCanvasMetrics();
    const nextScale = clamp(viewport.scale * factor, viewport.minScale, viewport.maxScale);
    const focusX = anchorX ?? width / 2;
    const focusY = anchorY ?? height / 2;
    const worldX = (focusX - viewport.offsetX) / viewport.scale;
    const worldY = (focusY - viewport.offsetY) / viewport.scale;

    viewport.scale = nextScale;
    viewport.offsetX = focusX - worldX * nextScale;
    viewport.offsetY = focusY - worldY * nextScale;
    clampViewport(viewport);
    syncMapZoomLabel();
    renderMap();
  }

  function renderMap() {
    const canvas = dom.mapCanvas;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    const selected = app.getSelectedLocation();
    const current = app.getCurrentLocation();
    const viewport = ensureMapViewport();

    context.clearRect(0, 0, canvas.width, canvas.height);
    drawWorldBackdrop(context, canvas.width, canvas.height);

    context.save();
    context.translate(viewport.offsetX, viewport.offsetY);
    context.scale(viewport.scale, viewport.scale);
    drawWorldBackdrop(context, canvas.width, canvas.height);
    drawMapTexture(context);
    drawRoutes(context);
    drawLocationNodes(context, selected, current, app.getGame().world.realm.activeRealmId);
    drawPlayerTrail(context, current);
    context.restore();
    syncMapZoomLabel();
  }

  Object.assign(app, {
    ensureMapViewport,
    clampMapViewport: clampViewport,
    getCanvasPointFromEvent,
    getMapWorldPointFromEvent: getWorldPointFromEvent,
    focusMapOnLocation: centerMapOn,
    resetMapViewport,
    zoomMap,
    renderMap,
    drawMapTexture,
    drawRoutes,
    drawLocationNodes,
    drawPlayerTrail,
  });
})();
