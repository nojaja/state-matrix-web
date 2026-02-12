import repoSync from './repoSync'
import { virtualFsManager } from './virtualFsSingleton'

type FileTriple = { path: string; base: string | null; local: string | null; remote: string | null }

type Fetcher = typeof fetch

type PushResult = { path: string; ok: boolean; message?: string }

/**
 * メタパス判定
 * @param path - ファイルパス
 * @returns 除外対象ならtrue
 */
function isRepoMetaPath(path: string): boolean {
  return path.startsWith('.repo-')
}

/**
 * 失敗結果生成
 * @param path - ファイルパス
 * @param message - エラーメッセージ
 * @returns 結果
 */
function toErrorResult(path: string, message: string): PushResult {
  return { path, ok: false, message }
}

/**
 * 成功結果生成
 * @param path - ファイルパス
 * @returns 結果
 */
function toSuccessResult(path: string): PushResult {
  return { path, ok: true }
}

/**
 * ワーカーのクリーンアップ
 * @param worker - ワーカー
 * @param handler - メッセージハンドラ
 */
function cleanupWorker(worker: Worker, handler: Function): void {
  try { worker.removeEventListener('message', handler as EventListener) } catch (e) { console.warn('[worker] removeEventListener error:', e) }
  try { worker.terminate() } catch (e) { console.warn('[worker] terminate error:', e) }
}

/**
 * VFSへファイルを書き込み
 * @param vfs - VirtualFS
 * @param files - ファイル配列
 * @returns 結果
 */
async function writeFilesToVfs(vfs: any, files: { path: string; content: string }[]): Promise<PushResult[]> {
  const results: PushResult[] = []
  for (const p of files) {
    try {
      if (typeof vfs.writeFile !== 'function') throw new Error('VirtualFS.writeFile is not available')
      await vfs.writeFile(p.path, p.content ?? '')
      results.push(toSuccessResult(p.path))
    } catch (e: any) {
      results.push(toErrorResult(p.path, String(e && e.message ? e.message : e)))
    }
  }
  return results
}

/**
 * VFSの変更をpush
 * @param vfs - VirtualFS
 * @returns push結果
 */
/**
 * push機能の有無を判定
 * @param vfs - VirtualFS
 * @returns 利用可ならtrue
 */
function hasPushSupport(vfs: any): boolean {
  return typeof vfs.getChangeSet === 'function' && typeof vfs.push === 'function'
}

/**
 * 変更セット取得
 * @param vfs - VirtualFS
 * @returns 変更セット
 */
async function getChangeSetSafe(vfs: any): Promise<any[]> {
  const changes = await vfs.getChangeSet()
  return Array.isArray(changes) ? changes : []
}

/**
 * 親コミットのSHA取得
 * @param vfs - VirtualFS
 * @returns 親SHA
 */
async function getParentSha(vfs: any): Promise<string | null> {
  if (typeof vfs.getIndex !== 'function') return null
  const idx = await vfs.getIndex().catch(() => null)
  return idx?.head ?? null
}

/**
 * push実行
 * @param vfs - VirtualFS
 * @param changes - 変更セット
 * @returns push結果
 */
async function executePush(vfs: any, changes: any[]): Promise<{ ok: boolean; message?: string }> {
  const parentSha = await getParentSha(vfs)
  const pushRes = await vfs.push({ parentSha, message: 'UI push', changes })
    .catch((e: any) => ({ ok: false, error: String(e && e.message ? e.message : e) }))
  if (!pushRes || pushRes.ok === false) {
    const msg = pushRes && (pushRes.error || pushRes.message)
      ? String(pushRes.error || pushRes.message)
      : 'vfs.push failed'
    return { ok: false, message: msg }
  }
  return { ok: true }
}

/**
 * VFSの変更をpush
 * @param vfs - VirtualFS
 * @returns push結果
 */
async function pushVfsChanges(vfs: any): Promise<{ ok: boolean; message?: string }> {
  if (!hasPushSupport(vfs)) return { ok: true }
  try {
    const changes = await getChangeSetSafe(vfs)
    if (changes.length === 0) return { ok: true }
    return await executePush(vfs, changes)
  } catch (e: any) {
    const msg = String(e && e.message ? e.message : e)
    return { ok: false, message: `vfs push error: ${msg}` }
  }
}

/**
 * 最終結果を組み立て
 * @param paths - 全パス
 * @param results - 書き込み結果
 * @returns 結果配列
 */
function finalizeResults(paths: { path: string; content: string }[], results: PushResult[]): PushResult[] {
  const excluded = paths
    .filter(p => isRepoMetaPath(p.path))
    .map(p => toErrorResult(p.path, 'excluded from push'))
  return [...excluded, ...results]
}

/**
 * 処理名: リポジトリWorkerクライアント
 * 処理概要: Web Workerを使用して非同期処理を実行
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
   * 処理名: リモートツリー取得
   * @param _cfg - 設定(未使用)
   * @returns リモートツリー情報
   */
  async fetchRemoteTree(_cfg: any): Promise<{ headSha: string | null; files: { path: string; sha: string }[] }> {
    try {
      const mod: any = await import('../workers/RepositoryWorker')
      const r = await mod.fetchRemoteTree(_cfg)
      return r.result || { headSha: null, files: [] }
    } catch (e) {
      console.error('[repositoryWorkerClient] fetchRemoteTree error:', e)
      return { headSha: null, files: [] }
    }
  }

  // threeway wrapper: use Worker if available, otherwise call worker module directly
  /**
   * 処理名: 3-wayマージ実行
   * @param triples - ファイルトリプルの配列
   * @returns マージ結果
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
      /**
       * 後処理をまとめて実行
       * @param action - 実行処理
       */
      const finalize = (action: () => void) => {
        if (finished) return
        finished = true
        clearTimeout(timeoutId)
        cleanupWorker(w, onmsg)
        action()
      }
      const timeoutId = setTimeout(() => {
        finalize(() => {
          try {
            const res = repoSync.threeway(triples)
            resolve(res)
          } catch (e) {
            reject(e)
          }
        })
      }, 2000)

      /**
       * Workerからのメッセージハンドラ
       * @param ev - メッセージイベント
       */
      const onmsg = (ev: MessageEvent) => {
        if (finished) return
        const msg = ev.data
        if (msg.type === 'threeway:result') {
          finalize(() => resolve({ resolved: msg.resolved, conflicts: msg.conflicts }))
          return
        }
        if (msg.type === 'error') {
          finalize(() => reject(new Error(msg.message || 'worker error')))
        }
      }

      w.addEventListener('message', onmsg)
      try { w.postMessage({ type: 'threeway', triples }) } catch (e) {
        finalize(() => reject(e))
      }
    })
  }

  /**
   * 処理名: パスをリモートにプッシュ
   * @param _cfg - リポ設定
   * @param _files - ファイル配列
   * @returns プッシュ結果
   */
  async push(_cfg: any, _files: { path: string; content: string }[]) {
    return this.pushPathsToRemote(_cfg, _files)
  }

  /**
   * 処理名: パスをリモートにプッシュ
   * @param _cfg - リポ設定
   * @param paths - ファイル配列
   * @returns プッシュ結果
   */
  async pushPathsToRemote(_cfg: any, paths: { path: string; content: string }[]): Promise<PushResult[]> {
    // Delegate push to VirtualFS when available. This writes files into VFS and then triggers VFS.push
    const filtered = paths.filter(p => !isRepoMetaPath(p.path))

    try {
      const vfs: any = virtualFsManager.getCurrentVfs()
      if (!vfs) throw new Error('VirtualFS is not available')

      const results = await writeFilesToVfs(vfs, filtered)
      const pushRes = await pushVfsChanges(vfs)
      if (!pushRes.ok) {
        return filtered.map(p => toErrorResult(p.path, pushRes.message || 'vfs.push failed'))
      }

      return finalizeResults(paths, results)
    } catch (e: any) {
      // fallback: return error per path
      const msg = String(e && e.message ? e.message : e)
      return filtered.map(p => toErrorResult(p.path, msg))
    }
  }
}

export default RepositoryWorkerClient

// Convenience named export for tests/harness: call threeway without instantiating class
/**
 * 処理名: threewayヘルパー
 * @param triples - ファイルトリプルの配列
 * @returns マージ結果
 */
export async function threeway(triples: FileTriple[]) {
  const c = new RepositoryWorkerClient()
  return await c.threeway(triples)
}
