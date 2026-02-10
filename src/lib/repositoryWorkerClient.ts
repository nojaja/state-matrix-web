import * as WorkerModule from '../workers/RepositoryWorker'
import repoSync from './repoSync'

type FileTriple = { path: string; base: string | null; local: string | null; remote: string | null }

type Fetcher = (input: RequestInfo, init?: RequestInit) => Promise<Response>

/**
 *
 */
export class RepositoryWorkerClient {
  fetcher: Fetcher
  private worker: Worker | null = null

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
  private createWorkerIfAvailable() {
    if (this.worker) return
    try {
      const W = (globalThis as any).Worker
      if (typeof W === 'function') {
        this.worker = new W('../workers/RepositoryWorker.js', { type: 'module' })
      }
    } catch (_e) {
      this.worker = null
    }
  }

  /**
   *
   * @param _cfg
   */
  async fetchRemoteTree(_cfg: any): Promise<{ headSha: string | null; files: { path: string; sha: string }[] }> {
    try {
      const r = await WorkerModule.fetchRemoteTree(_cfg)
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
    this.createWorkerIfAvailable()
    if (!this.worker) {
      const rAny: any = await WorkerModule.threeway(triples)
      if (rAny.ok) return rAny.result
      throw new Error(rAny.error || 'worker error')
    }

    return await new Promise<any>((resolve, reject) => {
      const w = this.worker!
      /**
       *
       * @param ev
       */
      const onmsg = (ev: MessageEvent) => {
        const msg = ev.data
        if (msg.type === 'threeway:result') {
          w.removeEventListener('message', onmsg)
          resolve({ resolved: msg.resolved, conflicts: msg.conflicts })
        } else if (msg.type === 'error') {
          w.removeEventListener('message', onmsg)
          reject(new Error(msg.message || 'worker error'))
        }
      }
      w.addEventListener('message', onmsg)
      w.postMessage({ type: 'threeway', triples })
      setTimeout(() => {
        try { w.removeEventListener('message', onmsg) } catch (_e) {}
        try { resolve(repoSync.threeway(triples)) } catch (e) { reject(e) }
      }, 2000)
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
    const filtered = paths.filter(p => !p.path.startsWith('.repo-'))
    const results: { path: string; ok: boolean; message?: string }[] = []
    const cfg = _cfg || {}
    const token = cfg.token

    /**
     *
     * @param ms
     */
    const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms))

    /**
     *
     * @param url
     * @param init
     * @param attempts
     */
    const requestWithRetries = async (url: RequestInfo, init?: RequestInit, attempts = 3) => {
      let lastErr: any = null
      for (let i = 0; i < attempts; i++) {
        try {
          const r = await this.fetcher(url, init)
          if (r.ok) return r
          if (r.status >= 500 && i < attempts - 1) { await sleep(200 * Math.pow(2, i)); continue }
          return r
        } catch (e) { lastErr = e; if (i < attempts - 1) await sleep(200 * Math.pow(2, i)) }
      }
      throw lastErr || new Error('request failed')
    }

    /**
     *
     * @param s
     */
    const encodeBase64 = (s: string) => {
      if (typeof (globalThis as any).btoa === 'function') return (globalThis as any).btoa(unescape(encodeURIComponent(s)))
      const NodeBuffer = (globalThis as any).Buffer
      if (NodeBuffer) return NodeBuffer.from(s).toString('base64')
      throw new Error('no base64 encoder available')
    }

    for (const p of filtered) {
      try {
        if (!cfg.provider) throw new Error('provider not configured')
        if (cfg.provider === 'github') {
          if (!token) throw new Error('token required for github')
          const owner = cfg.owner; const repo = cfg.repository; const branch = cfg.branch || 'main'
          const branchUrl = `https://api.github.com/repos/${owner}/${repo}/branches/${encodeURIComponent(branch)}`
          const branchRes = await requestWithRetries(branchUrl, { headers: { Authorization: token.startsWith('ghp') || token.startsWith('token ') ? `token ${token.replace(/^token\\s*/,'')}` : `Bearer ${token}` } }, 2)
          if (!branchRes.ok) {
            const txt = await branchRes.text().catch(() => '')
            if (branchRes.status === 404) { results.push({ path: p.path, ok: false, message: `github branch missing (needsInit): ${branchRes.status} ${txt}` }); continue }
            results.push({ path: p.path, ok: false, message: `github branch check failed: ${branchRes.status} ${txt}` }); continue
          }

          const url = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(p.path)}`
          const getRes = await requestWithRetries(url + `?ref=${encodeURIComponent(branch)}`, undefined, 2)
          let sha: string | undefined = undefined
          if (getRes.ok) { const j = await getRes.json().catch(() => ({})); sha = j.sha }

          const body: any = { message: `update ${p.path}`, content: typeof p.content === 'string' ? encodeBase64(p.content) : '', branch }
          if (sha) body.sha = sha

          const putRes = await requestWithRetries(url, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: (token.startsWith('ghp') || token.startsWith('token ')) ? `token ${token.replace(/^token\\s*/,'')}` : `Bearer ${token}` }, body: JSON.stringify(body) }, 3)
          if (!putRes.ok) {
            const text = await putRes.text().catch(() => '')
            if ((putRes.status === 409 || putRes.status === 422) && !body._retried) {
              const fresh = await requestWithRetries(url + `?ref=${encodeURIComponent(branch)}`, undefined, 2)
              if (fresh.ok) { const j = await fresh.json().catch(() => ({})); if (j && j.sha) { body.sha = j.sha; body._retried = true; const retryRes = await requestWithRetries(url, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: (token.startsWith('ghp') || token.startsWith('token ')) ? `token ${token.replace(/^token\\s*/,'')}` : `Bearer ${token}` }, body: JSON.stringify(body) }, 2); if (retryRes.ok) { results.push({ path: p.path, ok: true }); continue } } }
            }
            if (putRes.status === 409 || putRes.status === 422) results.push({ path: p.path, ok: false, message: `github conflict or precondition failed: ${putRes.status} ${text}` })
            else results.push({ path: p.path, ok: false, message: `github error: ${putRes.status} ${text}` })
            continue
          }
          results.push({ path: p.path, ok: true })
        } else if (cfg.provider === 'gitlab') {
          if (!token) throw new Error('token required for gitlab')
          const owner = cfg.owner; const repo = cfg.repository; const branch = cfg.branch || 'main'
          const project = encodeURIComponent(`${owner}/${repo}`)
          const filePath = encodeURIComponent(p.path)
          const baseUrl = `https://gitlab.com/api/v4/projects/${project}/repository/files/${filePath}`
          const branchCheck = `https://gitlab.com/api/v4/projects/${project}/repository/branches/${encodeURIComponent(branch)}`
          const bres = await requestWithRetries(branchCheck, { headers: { 'PRIVATE-TOKEN': token } }, 2)
          if (!bres.ok) { const txt = await bres.text().catch(() => ''); if (bres.status === 404) { results.push({ path: p.path, ok: false, message: `gitlab branch check failed (needsInit): ${bres.status} ${txt}` }); continue } results.push({ path: p.path, ok: false, message: `gitlab branch check failed: ${bres.status} ${txt}` }); continue }
          const getRes = await requestWithRetries(baseUrl + `?ref=${encodeURIComponent(branch)}`, { headers: { 'PRIVATE-TOKEN': token } }, 2)
          const body = { branch, content: p.content ?? '', commit_message: `update ${p.path}` }
          let res
          if (getRes.ok) res = await requestWithRetries(baseUrl, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'PRIVATE-TOKEN': token }, body: JSON.stringify(body) }, 3)
          else res = await requestWithRetries(baseUrl, { method: 'POST', headers: { 'Content-Type': 'application/json', 'PRIVATE-TOKEN': token }, body: JSON.stringify(body) }, 3)
          if (!res.ok) { const text = await res.text().catch(() => ''); results.push({ path: p.path, ok: false, message: `gitlab error: ${res.status} ${text}` }); continue }
          results.push({ path: p.path, ok: true })
        } else {
          throw new Error('unknown provider')
        }
      } catch (e: any) {
        results.push({ path: p.path, ok: false, message: String(e && e.message ? e.message : e) })
      }
    }
    for (const p of paths) { if (p.path.startsWith('.repo-')) results.unshift({ path: p.path, ok: false, message: 'excluded from push' }) }
    return results
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
