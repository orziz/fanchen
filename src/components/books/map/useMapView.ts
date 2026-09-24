import { computed, onBeforeUnmount, onMounted, reactive, type Ref } from 'vue'

export interface MapBounds { x: number; y: number; w: number; h: number }

/**
 * 地图视口：以地图坐标记录可视范围，支持滚轮 / 双指缩放、拖拽平移；
 * 拖动超过几像素即视为平移，不触发点选。容器尺寸变化时保持中心、跟上新比例，
 * 让指针换算始终与画面一致。
 */
export function useMapView(root: Ref<HTMLElement | null>, bounds: MapBounds) {
  const view = reactive({ x: bounds.x, y: bounds.y, w: bounds.w, h: bounds.h })
  const pointers = new Map<number, { x: number; y: number }>()
  let dragMoved = 0
  let pinchDistance = 0
  let aspect = bounds.w / bounds.h

  const minW = bounds.w * 0.22
  const maxW = bounds.w * 1.15
  const viewBox = computed(() => `${view.x} ${view.y} ${view.w} ${view.h}`)

  function clampView() {
    const marginX = view.w * 0.35
    const marginY = view.h * 0.35
    view.x = Math.min(Math.max(view.x, bounds.x - marginX), bounds.x + bounds.w - view.w + marginX)
    view.y = Math.min(Math.max(view.y, bounds.y - marginY), bounds.y + bounds.h - view.h + marginY)
  }

  function fit() {
    const rect = root.value?.getBoundingClientRect()
    aspect = rect && rect.height ? rect.width / rect.height : aspect
    if (bounds.w / bounds.h > aspect) {
      view.w = bounds.w
      view.h = bounds.w / aspect
    } else {
      view.h = bounds.h
      view.w = bounds.h * aspect
    }
    view.x = bounds.x + bounds.w / 2 - view.w / 2
    view.y = bounds.y + bounds.h / 2 - view.h / 2
  }

  /** 容器比例变了（改窗口、横竖屏切换）：保持中心与宽度，按新比例重算高度。 */
  function syncAspect() {
    const rect = root.value?.getBoundingClientRect()
    if (!rect || !rect.width || !rect.height) return
    const next = rect.width / rect.height
    if (Math.abs(next - view.w / view.h) < 1e-3) return
    const cx = view.x + view.w / 2
    const cy = view.y + view.h / 2
    aspect = next
    view.h = view.w / next
    view.x = cx - view.w / 2
    view.y = cy - view.h / 2
    clampView()
  }

  let observer: ResizeObserver | null = null
  onMounted(() => {
    if (typeof ResizeObserver === 'undefined' || !root.value) return
    observer = new ResizeObserver(syncAspect)
    observer.observe(root.value)
  })
  onBeforeUnmount(() => observer?.disconnect())

  function toMap(clientX: number, clientY: number) {
    const rect = root.value!.getBoundingClientRect()
    return { x: view.x + ((clientX - rect.left) / rect.width) * view.w, y: view.y + ((clientY - rect.top) / rect.height) * view.h }
  }

  function zoomAt(factor: number, clientX?: number, clientY?: number) {
    const rect = root.value?.getBoundingClientRect()
    if (!rect) return
    const anchor = clientX === undefined ? { x: view.x + view.w / 2, y: view.y + view.h / 2 } : toMap(clientX, clientY!)
    const nextW = Math.min(maxW, Math.max(minW, view.w * factor))
    const k = nextW / view.w
    view.x = anchor.x - (anchor.x - view.x) * k
    view.y = anchor.y - (anchor.y - view.y) * k
    view.w = nextW
    view.h = nextW / (rect.width / rect.height)
    clampView()
  }

  function centerOn(x: number, y: number, width = view.w) {
    const rect = root.value?.getBoundingClientRect()
    const ratio = rect && rect.height ? rect.width / rect.height : aspect
    view.w = Math.min(maxW, Math.max(minW, width))
    view.h = view.w / ratio
    view.x = x - view.w / 2
    view.y = y - view.h / 2
    clampView()
  }

  function onWheel(event: WheelEvent) {
    zoomAt(Math.exp(event.deltaY * 0.0014), event.clientX, event.clientY)
  }

  function onPointerDown(event: PointerEvent) {
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
    dragMoved = 0
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()]
      pinchDistance = Math.hypot(a.x - b.x, a.y - b.y)
    }
  }

  function onPointerMove(event: PointerEvent) {
    const prev = pointers.get(event.pointerId)
    if (!prev) return
    const rect = root.value!.getBoundingClientRect()
    if (pointers.size === 2) {
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
      const [a, b] = [...pointers.values()]
      const distance = Math.hypot(a.x - b.x, a.y - b.y)
      if (pinchDistance > 0) zoomAt(pinchDistance / distance, (a.x + b.x) / 2, (a.y + b.y) / 2)
      pinchDistance = distance
      dragMoved += 10
      return
    }
    const dx = event.clientX - prev.x
    const dy = event.clientY - prev.y
    dragMoved += Math.abs(dx) + Math.abs(dy)
    view.x -= (dx / rect.width) * view.w
    view.y -= (dy / rect.height) * view.h
    clampView()
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
  }

  function onPointerUp(event: PointerEvent) {
    pointers.delete(event.pointerId)
    if (pointers.size < 2) pinchDistance = 0
  }

  /** 刚才那一下是否算拖动（拖动后抬手不应选中节点）。 */
  function wasDrag() {
    return dragMoved > 5
  }

  return { view, viewBox, fit, zoomAt, centerOn, onWheel, onPointerDown, onPointerMove, onPointerUp, wasDrag }
}
