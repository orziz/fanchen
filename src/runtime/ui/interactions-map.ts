(() => {
  const app = window.ShanHai;
  const { dom, state, runtime } = app;
  const { LOCATIONS } = app.tables;

  function onCanvasClick(event) {
    if (runtime.mapIgnoreClick) {
      runtime.mapIgnoreClick = false;
      return;
    }
    const point = app.getMapWorldPointFromEvent?.(event);
    if (!point) return;
    const hitRadius = 30 / app.ensureMapViewport().scale;
    const found = LOCATIONS.find((location) => Math.hypot(location.x - point.x, location.y - point.y) < hitRadius);
    if (!found) return;
    state.selectedLocationId = found.id;
    app.renderLocationDetail();
    app.focusMapOnLocation?.(found.id, { preserveScale: true, render: false });
    app.renderMap();
  }

  function onCanvasPointerDown(event) {
    if (event.button !== 0) return;
    if (runtime.mapInteraction) return;
    const viewport = app.ensureMapViewport?.();
    if (!viewport) return;
    runtime.mapInteraction = {
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startOffsetX: viewport.offsetX,
      startOffsetY: viewport.offsetY,
      didDrag: false,
    };
    if (event.pointerId != null) {
      dom.mapCanvas?.setPointerCapture?.(event.pointerId);
    }
  }

  function onCanvasPointerMove(event) {
    const drag = runtime.mapInteraction;
    if (!drag) return;
    if (drag.pointerId != null && event.pointerId != null && drag.pointerId !== event.pointerId) return;
    const rect = dom.mapCanvas.getBoundingClientRect();
    const deltaX = ((event.clientX - drag.startClientX) / rect.width) * dom.mapCanvas.width;
    const deltaY = ((event.clientY - drag.startClientY) / rect.height) * dom.mapCanvas.height;
    if (!drag.didDrag && Math.hypot(deltaX, deltaY) < 8) return;
    drag.didDrag = true;
    dom.mapCanvasShell?.classList.add("is-panning");
    const viewport = app.ensureMapViewport();
    viewport.offsetX = drag.startOffsetX + deltaX;
    viewport.offsetY = drag.startOffsetY + deltaY;
    app.clampMapViewport?.(viewport);
    app.renderMap();
  }

  function stopCanvasPointer(event) {
    const drag = runtime.mapInteraction;
    if (!drag || (event.pointerId != null && drag.pointerId !== event.pointerId)) return;
    runtime.mapIgnoreClick = Boolean(drag.didDrag);
    runtime.mapInteraction = null;
    dom.mapCanvasShell?.classList.remove("is-panning");
    if (event.pointerId != null) {
      dom.mapCanvas?.releasePointerCapture?.(event.pointerId);
    }
  }

  function onCanvasWheel(event) {
    event.preventDefault();
    const point = app.getCanvasPointFromEvent?.(event);
    if (!point) return;
    const factor = event.deltaY < 0 ? 1.12 : 0.9;
    app.zoomMap?.(factor, point.x, point.y);
  }

  function handleMapWindowClick(event) {
    const zoomButton = app.getClosest(event.target, "[data-map-zoom]");
    if (zoomButton) {
      app.zoomMap?.(zoomButton.dataset.mapZoom === "in" ? 1.14 : 0.88);
      return;
    }

    const resetButton = app.getClosest(event.target, "[data-map-reset]");
    if (resetButton) {
      app.resetMapViewport?.();
    }
  }

  Object.assign(app, {
    onCanvasClick,
    onCanvasPointerDown,
    onCanvasPointerMove,
    stopCanvasPointer,
    onCanvasWheel,
    handleMapWindowClick,
  });
})();