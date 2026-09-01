/**
 * 最小構成の型付きイベントバス。
 * システム間の直接参照を避けるための唯一の連絡手段。
 */
export type EventMap = Record<string, unknown>;

type Handler<T> = (payload: T) => void;

export class EventBus<M extends EventMap> {
  private readonly handlers = new Map<keyof M, Set<Handler<never>>>();

  on<K extends keyof M>(type: K, handler: Handler<M[K]>): () => void {
    let set = this.handlers.get(type);
    if (!set) {
      set = new Set();
      this.handlers.set(type, set);
    }
    set.add(handler as Handler<never>);
    return () => this.off(type, handler);
  }

  once<K extends keyof M>(type: K, handler: Handler<M[K]>): () => void {
    const off = this.on(type, (payload) => {
      off();
      handler(payload);
    });
    return off;
  }

  off<K extends keyof M>(type: K, handler: Handler<M[K]>): void {
    this.handlers.get(type)?.delete(handler as Handler<never>);
  }

  emit<K extends keyof M>(type: K, payload: M[K]): void {
    const set = this.handlers.get(type);
    if (!set) return;
    // ハンドラ内での購読解除に耐えるためコピーしてから回す
    for (const handler of [...set]) {
      (handler as Handler<M[K]>)(payload);
    }
  }

  clear(): void {
    this.handlers.clear();
  }
}
