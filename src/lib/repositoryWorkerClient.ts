import repoSync from './repoSync'
import { virtualFsManager } from './virtualFsSingleton'

type FileTriple = { path: string; base: string | null; local: string | null; remote: string | null }

type Fetcher = (input: RequestInfo, init?: RequestInit) => Promise<Response>

/**
 *
 */
export class RepositoryWorkerClient {
  fetcher: Fetcher
  // transient workers are created per-call; no persistent worker field

  /**
   *
   * @param fetcher
   */
  constructor(fetcher?: Fetcher) {
    this.fetcher = fetcher || (typeof fetch !== 'undefined' ? fetch : (async () => { throw new Error('fetch not available') }) as any)
  }

  // Attempt to create a browser worker; fall back gracefully
  /**
   *
   */
  // no persistent worker: threeway creates a transient Worker per-call

  /**
   *
   * @param _cfg
   */
  async fetchRemoteTree(_cfg: any): Promise<{ headSha: string | null; files: { path: string; sha: string }[] }> {
    try {
      const mod: any = await import('../workers/RepositoryWorker')
      const r = await mod.fetchRemoteTree(_cfg)
      return r.result || { headSha: null, files: [] }
    } catch (_e) {
      return { headSha: null, files: [] }
    }
  }

  // threeway wrapper: use Worker if available, otherwise call worker module directly
  /**
   *
   * @param triples
   */
  async threeway(triples: FileTriple[]) {
    // Prefer using a transient Worker per-call to avoid leaking workers/event listeners
    const WorkerCtor = (globalThis as any).Worker
    if (typeof WorkerCtor !== 'function') {
      // fallback to direct module call (dynamic import to avoid executing worker top-level code in window)
      const mod: any = await import('../workers/RepositoryWorker')
      const rAny: any = await mod.threeway(triples)
      if (rAny.ok) return rAny.result
      throw new Error(rAny.error || 'worker error')
    }

    return await new Promise<any>((resolve, reject) => {
      const w = new WorkerCtor('../workers/RepositoryWorker.js', { type: 'module' })
      let finished = false
      const timeoutId = setTimeout(() => {
        if (finished) return
        finished = true
        try { w.terminate() } catch (_e) {}
        try {
          const res = repoSync.threeway(triples)
          resolve(res)
        } catch (e) {
          reject(e)
        }
      }, 2000)

      const onmsg = (ev: MessageEvent) => {
        if (finished) return
        const msg = ev.data
        if (msg.type === 'threeway:result') {
          finished = true
          clearTimeout(timeoutId)
          try { w.removeEventListener('message', onmsg) } catch (_e) {}
          try { w.terminate() } catch (_e) {}
          resolve({ resolved: msg.resolved, conflicts: msg.conflicts })
        } else if (msg.type === 'error') {
          finished = true
          clearTimeout(timeoutId)
          try { w.removeEventListener('message', onmsg) } catch (_e) {}
          try { w.terminate() } catch (_e) {}
          reject(new Error(msg.message || 'worker error'))
        }
      }

      w.addEventListener('message', onmsg)
      try { w.postMessage({ type: 'threeway', triples }) } catch (e) {
        finished = true
        clearTimeout(timeoutId)
        try { w.terminate() } catch (_e) {}
        reject(e)
      }
    })
  }

  /**
   *
   * @param _cfg
   * @param _files
   */
  async push(_cfg: any, _files: { path: string; content: string }[]) {
    return this.pushPathsToRemote(_cfg, _files)
  }

  /**
   *
   * @param _cfg
   * @param paths
   */
  async pushPathsToRemote(_cfg: any, paths: { path: string; content: string }[]): Promise<{ path: string; ok: boolean; message?: string }[]> {
    // Delegate push to VirtualFS when available. This writes files into VFS and then triggers VFS.push
    const filtered = paths.filter(p => !p.path.startsWith('.repo-'))
    const results: { path: string; ok: boolean; message?: string }[] = []

    try {
      const vfs: any = virtualFsManager.getCurrentVfs()
      if (!vfs) throw new Error('VirtualFS is not available')

      // write files into VFS workspace
      for (const p of filtered) {
        try {
          if (typeof vfs.writeFile !== 'function') throw new Error('VirtualFS.writeFile is not available')
          await vfs.writeFile(p.path, p.content ?? '')
          results.push({ path: p.path, ok: true })
        } catch (e: any) {
          results.push({ path: p.path, ok: false, message: String(e && e.message ? e.message : e) })
        }
      }

      // If VFS supports push flow, collect changes and push
      if (typeof vfs.getChangeSet === 'function' && typeof vfs.push === 'function') {
        try {
          const changes = await vfs.getChangeSet()
          if (Array.isArray(changes) && changes.length > 0) {
            const idx = (typeof vfs.getIndex === 'function') ? await vfs.getIndex().catch(() => null) : null
            const parentSha = idx?.head ?? null
            const pushRes = await vfs.push({ parentSha, message: 'UI push', changes }).catch((e: any) => ({ ok: false, error: String(e && e.message ? e.message : e) }))
            if (!pushRes || pushRes.ok === false) {
              const msg = pushRes && (pushRes.error || pushRes.message) ? String(pushRes.error || pushRes.message) : 'vfs.push failed'
              // mark written files as failed at push stage
              return filtered.map(p => ({ path: p.path, ok: false, message: msg }))
            }
          }
        } catch (e: any) {
          const msg = String(e && e.message ? e.message : e)
          return filtered.map(p => ({ path: p.path, ok: false, message: `vfs push error: ${msg}` }))
        }
      }

      // Prepend excluded entries for .repo-
      for (const p of paths) { if (p.path.startsWith('.repo-')) results.unshift({ path: p.path, ok: false, message: 'excluded from push' }) }
      return results
    } catch (e: any) {
      // fallback: return error per path
      const msg = String(e && e.message ? e.message : e)
      return filtered.map(p => ({ path: p.path, ok: false, message: msg }))
    }
  }
}

export default RepositoryWorkerClient

// Convenience named export for tests/harness: call threeway without instantiating class
/**
 *
 * @param triples
 */
export async function threeway(triples: FileTriple[]) {
  const c = new RepositoryWorkerClient()
  return await c.threeway(triples)
}
