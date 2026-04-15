/* ─── Lightweight typed EventBus ─── */

type Handler = (...args: any[]) => void

export class EventBus {
  private _handlers = new Map<string, Set<Handler>>()

  on(type: string, handler: Handler): () => void {
    if (!this._handlers.has(type)) this._handlers.set(type, new Set())
    this._handlers.get(type)!.add(handler)
    return () => this.off(type, handler)
  }

  off(type: string, handler: Handler) {
    this._handlers.get(type)?.delete(handler)
  }

  emit(type: string, ...args: any[]) {
    this._handlers.get(type)?.forEach(h => h(...args))
    // wildcard listeners
    this._handlers.get('*')?.forEach(h => h(type, ...args))
  }

  clear() {
    this._handlers.clear()
  }
}

/* ─── Global singleton ─── */
export const bus = new EventBus()
