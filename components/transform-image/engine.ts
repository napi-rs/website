// components/transform-image/engine.ts
import type { Format, WorkerResponse } from './protocol'

export class TransformEngine {
  private worker: Worker
  private seq = 0
  private pending = new Map<number, (r: WorkerResponse) => void>()

  constructor() {
    this.worker = new Worker(new URL('./worker.ts', import.meta.url), {
      type: 'module',
    })
    this.worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
      const resolve = this.pending.get(e.data.id)
      if (resolve) {
        this.pending.delete(e.data.id)
        resolve(e.data)
      }
    }
  }

  // The worker takes OWNERSHIP of `bytes` (transferred), so callers must pass a
  // copy (`bytes.slice(0)`) if they still need the original.
  transform(
    format: Format,
    quality: number,
    chroma: number,
    bytes: ArrayBuffer,
  ): Promise<WorkerResponse> {
    const id = ++this.seq
    return new Promise<WorkerResponse>((resolve) => {
      this.pending.set(id, resolve)
      this.worker.postMessage({ id, format, quality, chroma, bytes }, [bytes])
    })
  }

  dispose() {
    this.worker.terminate()
    this.pending.clear()
  }
}
