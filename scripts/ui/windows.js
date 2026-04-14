(() => {
  const app = window.ShanHai;
  const { config, dom, state, runtime } = app;
  const WINDOW_IDS = ["map", "journal", "profile", "command"];
  const WINDOW_LAYOUT_KEY = `${config.SAVE_KEY || "fan-chen-li-dao-save"}-window-layout-v1`;

  function getDefaultDockSide(windowId) {
    return windowId === "map" ? "left" : "right";
  }

  function getDefaultWindowState(windowId) {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    if (windowId === "map") {
      return {
        open: true,
        left: Math.max(24, Math.round(viewportWidth * 0.08)),
        top: Math.max(92, Math.round(viewportHeight * 0.1)),
        z: 2,
        minimized: false,
        dockSide: null,
      };
    }

    if (windowId === "profile") {
      return {
        open: false,
        left: Math.max(24, window.innerWidth - Math.min(Math.round(viewportWidth * 0.36), 620) - 44),
        top: Math.max(120, Math.round(viewportHeight * 0.18)),
        z: 4,
        minimized: false,
        dockSide: null,
      };
    }

    if (windowId === "command") {
      return {
        open: false,
        left: Math.max(24, window.innerWidth - Math.min(Math.round(viewportWidth * 0.42), 720) - 56),
        top: Math.max(116, Math.round(viewportHeight * 0.16)),
        z: 5,
        minimized: false,
        dockSide: null,
      };
    }

    return {
      open: false,
      left: Math.max(24, viewportWidth - Math.min(Math.round(viewportWidth * 0.34), 560) - 28),
      top: Math.max(104, Math.round(viewportHeight * 0.14)),
      z: 3,
      minimized: false,
      dockSide: null,
    };
  }

  function getWindowElement(windowId) {
    if (windowId === "map") return dom.mapWindow;
    if (windowId === "journal") return dom.journalWindow;
    if (windowId === "profile") return dom.profileWindow;
    if (windowId === "command") return dom.commandWindow;
    return null;
  }

  function getWindowBody(windowId) {
    return getWindowElement(windowId)?.querySelector(".window-body") || null;
  }

  function getWindowToggleButton(windowId) {
    return document.querySelector(`[data-open-window="${windowId}"]`);
  }

  function snapshotWindowLayout() {
    return {
      windowZCounter: state.windowZCounter || 3,
      windows: WINDOW_IDS.reduce((result, windowId) => {
        const windowState = ensureWindowState(windowId);
        result[windowId] = {
          open: Boolean(windowState.open),
          left: Math.round(windowState.left || 0),
          top: Math.round(windowState.top || 0),
          z: windowState.z || 1,
          minimized: Boolean(windowState.minimized),
          dockSide: windowState.dockSide || null,
        };
        return result;
      }, {}),
    };
  }

  function persistWindowLayout() {
    try {
      localStorage.setItem(WINDOW_LAYOUT_KEY, JSON.stringify(snapshotWindowLayout()));
    } catch (error) {
      // Ignore localStorage failures; gameplay should continue without layout persistence.
    }
  }

  function loadWindowLayout() {
    if (runtime.windowLayoutLoaded) return;
    runtime.windowLayoutLoaded = true;
    try {
      const raw = localStorage.getItem(WINDOW_LAYOUT_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      state.windowZCounter = Math.max(3, Number(parsed.windowZCounter) || 3);
      state.windows = state.windows || {};
      WINDOW_IDS.forEach((windowId) => {
        const saved = parsed.windows?.[windowId];
        if (!saved) return;
        state.windows[windowId] = {
          ...getDefaultWindowState(windowId),
          ...saved,
        };
      });
    } catch (error) {
      state.windows = state.windows || {};
    }
  }

  function ensureWindowState(windowId) {
    loadWindowLayout();
    state.windows = state.windows || {};
    state.windowZCounter = state.windowZCounter || 3;
    if (!state.windows[windowId]) {
      state.windows[windowId] = getDefaultWindowState(windowId);
    }
    if (!state.windows[windowId].z) {
      state.windowZCounter += 1;
      state.windows[windowId].z = state.windowZCounter;
    }
    if (typeof state.windows[windowId].minimized !== "boolean") {
      state.windows[windowId].minimized = false;
    }
    if (!("dockSide" in state.windows[windowId])) {
      state.windows[windowId].dockSide = null;
    }
    return state.windows[windowId];
  }

  function applyDockedPosition(windowId, element, windowState) {
    const dockSide = windowState.dockSide || getDefaultDockSide(windowId);
    const margin = 12;
    const top = 92;
    const maxHeight = Math.max(320, window.innerHeight - top - margin);
    element.style.top = `${top}px`;
    element.style.left = dockSide === "left" ? `${margin}px` : `${Math.max(margin, window.innerWidth - element.offsetWidth - margin)}px`;
    element.style.maxHeight = `${maxHeight}px`;
    windowState.top = top;
    windowState.left = dockSide === "left" ? margin : Math.max(margin, window.innerWidth - element.offsetWidth - margin);
  }

  function constrainWindow(windowId) {
    const element = getWindowElement(windowId);
    const windowState = ensureWindowState(windowId);
    if (!element || !windowState.open || windowState.dockSide) return;
    const width = element.offsetWidth || 0;
    const height = element.offsetHeight || 0;
    const maxLeft = Math.max(12, window.innerWidth - width - 12);
    const maxTop = Math.max(12, window.innerHeight - height - 12);
    windowState.left = Math.max(12, Math.min(maxLeft, windowState.left));
    windowState.top = Math.max(12, Math.min(maxTop, windowState.top));
  }

  function applyWindowState(windowId) {
    const element = getWindowElement(windowId);
    const body = getWindowBody(windowId);
    const windowState = ensureWindowState(windowId);
    if (!element) return;
    const isOpen = Boolean(windowState.open);
    const isMinimized = Boolean(windowState.minimized);
    const isDocked = Boolean(windowState.dockSide);

    element.hidden = !isOpen;
    element.style.display = isOpen ? "flex" : "none";
    element.classList.toggle("is-minimized", isOpen && isMinimized);
    element.classList.toggle("is-docked", isOpen && isDocked);

    if (body) {
      body.hidden = isMinimized;
      body.style.display = isMinimized ? "none" : "";
    }

    if (isOpen) {
      element.removeAttribute("inert");
      if (isDocked) {
        applyDockedPosition(windowId, element, windowState);
      } else {
        element.style.maxHeight = "";
        constrainWindow(windowId);
        element.style.left = `${windowState.left}px`;
        element.style.top = `${windowState.top}px`;
      }
      element.style.zIndex = String(50 + (windowState.z || 1));
    } else {
      element.setAttribute("inert", "");
      element.style.maxHeight = "";
    }
  }

  function bringWindowToFront(windowId) {
    const windowState = ensureWindowState(windowId);
    state.windowZCounter = (state.windowZCounter || 3) + 1;
    windowState.z = state.windowZCounter;
    applyWindowState(windowId);
    persistWindowLayout();
  }

  function openWindow(windowId) {
    const windowState = ensureWindowState(windowId);
    windowState.open = true;
    bringWindowToFront(windowId);
    renderFloatingWindows();
    persistWindowLayout();
  }

  function closeWindow(windowId) {
    const element = getWindowElement(windowId);
    if (element && element.contains(document.activeElement)) {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      const fallbackButton = getWindowToggleButton(windowId);
      fallbackButton?.focus({ preventScroll: true });
    }
    const windowState = ensureWindowState(windowId);
    windowState.open = false;
    runtime.activeWindowDrag = runtime.activeWindowDrag?.windowId === windowId ? null : runtime.activeWindowDrag;
    applyWindowState(windowId);
    renderFloatingWindows();
    persistWindowLayout();
  }

  function toggleWindow(windowId) {
    const windowState = ensureWindowState(windowId);
    if (windowState.open) {
      closeWindow(windowId);
      return;
    }
    openWindow(windowId);
  }

  function closeTopWindow() {
    const topmost = WINDOW_IDS
      .map((windowId) => ({ windowId, windowState: ensureWindowState(windowId) }))
      .filter(({ windowState }) => windowState.open)
      .sort((left, right) => (right.windowState.z || 0) - (left.windowState.z || 0))[0];
    if (!topmost) return;
    closeWindow(topmost.windowId);
  }

  function toggleWindowMinimize(windowId) {
    const windowState = ensureWindowState(windowId);
    if (!windowState.open) {
      openWindow(windowId);
    }
    windowState.minimized = !windowState.minimized;
    bringWindowToFront(windowId);
    renderFloatingWindows();
    persistWindowLayout();
  }

  function toggleWindowDock(windowId) {
    const windowState = ensureWindowState(windowId);
    if (!windowState.open) {
      windowState.open = true;
    }
    windowState.dockSide = windowState.dockSide ? null : getDefaultDockSide(windowId);
    windowState.minimized = false;
    bringWindowToFront(windowId);
    renderFloatingWindows();
    persistWindowLayout();
  }

  function startWindowDrag(windowId, event) {
    if (event.button !== 0) return;
    const element = getWindowElement(windowId);
    if (!element) return;
    const windowState = ensureWindowState(windowId);
    if (windowState.dockSide) {
      windowState.dockSide = null;
      applyWindowState(windowId);
    }
    bringWindowToFront(windowId);
    runtime.activeWindowDrag = {
      windowId,
      offsetX: event.clientX - windowState.left,
      offsetY: event.clientY - windowState.top,
    };
    document.body.classList.add("dragging-window");
  }

  function handleWindowDrag(event) {
    const drag = runtime.activeWindowDrag;
    if (!drag) return;
    const element = getWindowElement(drag.windowId);
    if (!element) return;
    const windowState = ensureWindowState(drag.windowId);
    const maxLeft = Math.max(12, window.innerWidth - element.offsetWidth - 12);
    const maxTop = Math.max(12, window.innerHeight - element.offsetHeight - 12);
    windowState.left = Math.max(12, Math.min(maxLeft, event.clientX - drag.offsetX));
    windowState.top = Math.max(12, Math.min(maxTop, event.clientY - drag.offsetY));
    applyWindowState(drag.windowId);
  }

  function stopWindowDrag() {
    if (!runtime.activeWindowDrag) return;
    runtime.activeWindowDrag = null;
    document.body.classList.remove("dragging-window");
    persistWindowLayout();
  }

  function renderFloatingWindows() {
    WINDOW_IDS.forEach((windowId) => {
      ensureWindowState(windowId);
      applyWindowState(windowId);
    });

    document.querySelectorAll("[data-open-window]").forEach((button) => {
      const windowId = button.dataset.openWindow;
      const windowState = ensureWindowState(windowId);
      button.classList.toggle("active", Boolean(windowState.open));
      button.classList.toggle("is-minimized", Boolean(windowState.minimized));
    });

    document.querySelectorAll("[data-window-action=\"minimize\"]").forEach((button) => {
      const windowState = ensureWindowState(button.dataset.windowId);
      button.classList.toggle("active", Boolean(windowState.minimized));
      button.textContent = windowState.minimized ? "展开" : "最小化";
    });

    document.querySelectorAll("[data-window-action=\"dock\"]").forEach((button) => {
      const windowState = ensureWindowState(button.dataset.windowId);
      button.classList.toggle("active", Boolean(windowState.dockSide));
      button.textContent = windowState.dockSide ? "取消停靠" : "停靠";
    });
  }

  function bindWindowEvents() {
    if (runtime.windowEventsBound) return;
    runtime.windowEventsBound = true;
    loadWindowLayout();
    document.addEventListener("pointermove", handleWindowDrag);
    document.addEventListener("pointerup", stopWindowDrag);
    document.addEventListener("mousemove", handleWindowDrag);
    document.addEventListener("mouseup", stopWindowDrag);
    window.addEventListener("blur", stopWindowDrag);
    window.addEventListener("resize", renderFloatingWindows);
  }

  Object.assign(app, {
    ensureWindowState,
    openWindow,
    closeWindow,
    toggleWindow,
    closeTopWindow,
    toggleWindowMinimize,
    toggleWindowDock,
    bringWindowToFront,
    startWindowDrag,
    renderFloatingWindows,
    bindWindowEvents,
    persistWindowLayout,
  });
})();