import { defineStore } from 'pinia'
import { mergeConflictsMaps } from '../lib/repoSync'
import type { RepoConfig, ConflictTriple, RepoMetadata } from '../types/models'
import { virtualFsManager } from '../lib/virtualFsSingleton'
export type { RepoConfig, ConflictTriple, RepoMetadata }

/**
 * 競合アイテムのキーを取得
 * @param item - 競合アイテム
 * @returns 競合キー
 */
function getConflictKey(item: any): string | null {
  const id = typeof item?.id === 'string' ? item.id : ''
  const path = typeof item?.path === 'string' ? item.path : ''
  return id || path || null
}

/**
 * ConflictItemをConflictTripleに変換
 * @param item - 競合アイテム
 * @returns 競合トリプル
 */
function toConflictTriple(item: any): ConflictTriple | null {
  if (!item) return null
  return {
    id: item.id || null,
    path: item.path || '',
    format: item.format || 'text',
    base: item.base || '',
    local: item.local || '',
    remote: item.remote || '',
    timestamp: item.timestamp || new Date().toISOString(),
    metadata: item.metadata || {}
  } as ConflictTriple
}

/**
 * 競合配列からマップを生成
 * @param conflictsArr - 競合配列
 * @returns 競合マップ
 */
function buildConflictMap(conflictsArr: any[]): Record<string, ConflictTriple> {
  const conflictMap: Record<string, ConflictTriple> = {}
  for (const item of conflictsArr) {
    const key = getConflictKey(item)
    if (!key) continue
    const triple = toConflictTriple(item)
    if (!triple) continue
    conflictMap[key] = triple
  }
  return conflictMap
}

/**
 * VirtualFSを安全にオープン
 * @param project - プロジェクト名
 * @returns VirtualFS
 */
async function openProjectSafely(project: string): Promise<any | null> {
  try {
    return await virtualFsManager.openProject(project)
  } catch (e) {
    console.warn('[metadataStore] cannot open project:', e)
    return null
  }
}

/**
 * Adapter取得
 * @param vfs - VirtualFS
 * @returns Adapter
 */
async function getAdapterSafely(vfs: any): Promise<any | null> {
  try {
    return await vfs.getAdapter()
  } catch (e) {
    console.warn('[metadataStore] getAdapter error:', e)
    return null
  }
}

/**
 * AdapterMetaからRepoConfigを生成
 * @param adapter - AdapterMeta
 * @returns RepoConfig
 */
function buildRepoConfigFromAdapter(adapter: any): RepoConfig {
  const opts = (adapter.opts || {}) as Record<string, any>
  return {
    provider: adapter.type === 'gitlab' ? 'gitlab' : 'github',
    owner: opts.owner || (typeof opts.projectId === 'string' ? (opts.projectId.split('/')?.[0] || '') : ''),
    repository: opts.repo || (typeof opts.projectId === 'string' ? (opts.projectId.split('/')?.[1] || '') : ''),
    branch: opts.branch || 'main',
    host: opts.host || undefined,
    token: opts.token || undefined,
    lastSyncedCommitSha: null
  }
}

/**
 * 競合をストアから削除
 * @param conflictData - 競合マップ
 * @param project - プロジェクト名
 * @param path - パス
 */
function removeConflictByPath(conflictData: Record<string, Record<string, ConflictTriple>>, project: string, path: string): void {
  if (!conflictData[project]) return
  for (const key of Object.keys(conflictData[project])) {
    const conflict = conflictData[project][key]
    if (conflict && conflict.path === path) {
      delete conflictData[project][key]
      return
    }
  }
}

/**
 * 解決済みリストへ追加
 * @param resolvedData - 解決済みマップ
 * @param project - プロジェクト名
 * @param path - パス
 */
function addResolvedPath(resolvedData: Record<string, string[]>, project: string, path: string): void {
  if (!resolvedData[project]) resolvedData[project] = []
  if (!resolvedData[project].includes(path)) resolvedData[project].push(path)
}

/**
 * 現在のVFS取得、無ければ開く
 * @param project - プロジェクト名
 * @returns VFSとopenedHere
 */
async function getCurrentOrOpenVfs(project: string): Promise<{ vfs: any | null; openedHere: boolean }> {
  const current = virtualFsManager.getCurrentVfs()
  if (current) return { vfs: current, openedHere: false }
  const opened = await openProjectSafely(project)
  return { vfs: opened, openedHere: !!opened }
}

/**
 * Adapter取得（必要なら再オープン）
 * @param project - プロジェクト名
 * @param vfs - VirtualFS
 * @param openedHere - 開いたかどうか
 * @returns AdapterとopenedHere
 */
async function getAdapterWithFallback(project: string, vfs: any | null, openedHere: boolean): Promise<{ adapter: any | null; openedHere: boolean }> {
  if (!vfs || typeof vfs.getAdapter !== 'function') return { adapter: null, openedHere }
  let adapter = await getAdapterSafely(vfs)
  if (adapter || openedHere) return { adapter, openedHere }
  const reopened = await openProjectSafely(project)
  if (!reopened || typeof reopened.getAdapter !== 'function') return { adapter: null, openedHere: true }
  adapter = await getAdapterSafely(reopened)
  return { adapter, openedHere: true }
}

/**
 * RepoConfigからAdapterメタを生成
 * @param cfg - リポ設定
 * @returns Adapterメタ
 */
function buildAdapterPayload(cfg: RepoConfig): any {
  if (cfg.provider === 'gitlab') {
    return { type: 'gitlab', opts: { projectId: `${cfg.owner}/${cfg.repository}`, host: cfg.host || 'gitlab.com', token: cfg.token, branch: cfg.branch || 'main' } }
  }
  return { type: 'github', opts: { owner: cfg.owner, repo: cfg.repository, token: cfg.token, branch: cfg.branch || 'main' } }
}

/**
 * Adapter設定を安全に実行
 * @param vfs - VirtualFS
 * @param payload - Adapterメタ
 */
async function setAdapterWithFallback(vfs: any, payload: any): Promise<void> {
  try {
    await vfs.setAdapter(null, payload)
  } catch (e) {
    console.warn('[metadataStore] setAdapter fallback:', e)
    await vfs.setAdapter(payload)
  }
}

/**
 * Adapterが未設定ならセット
 * @param vfs - VirtualFS
 * @param cfg - リポ設定
 */
async function ensureAdapterOnVfs(vfs: any, cfg: RepoConfig): Promise<void> {
  try {
    const adapterOnVfs = typeof vfs.getAdapter === 'function' ? await vfs.getAdapter() : null
    if ((!adapterOnVfs || !adapterOnVfs.type) && cfg && typeof vfs.setAdapter === 'function') {
      const adapterPayload = buildAdapterPayload(cfg)
      await setAdapterWithFallback(vfs, adapterPayload)
    }
  } catch (e) {
    console.warn('failed to ensure adapter on VFS', e)
  }
}

/**
 * pull実行
 * @param vfs - VirtualFS
 */
async function pullVfsSafe(vfs: any): Promise<void> {
  if (typeof vfs.pull !== 'function') return
  try { await vfs.pull() } catch (e) { console.error('vfs.pull failed', e) }
}

/**
 * メタデータ取得
 * @param vfs - VirtualFS
 * @returns メタデータ
 */
async function buildMetadataFromVfs(vfs: any): Promise<any> {
  let metadata: any = { headSha: null, files: [], updatedAt: new Date().toISOString() }
  try {
    const statInfo = typeof vfs.stat === 'function' ? await vfs.stat('.') : null
    const idx = typeof vfs.getIndex === 'function' ? await vfs.getIndex() : null
    metadata = { headSha: idx?.head || null, files: idx?.files || [], updatedAt: new Date().toISOString(), stat: statInfo }
  } catch (e) {
    console.warn('[metadataStore] metadata fetch error:', e)
  }
  return metadata
}

/**
 * VFSから競合マップ取得
 * @param vfs - VirtualFS
 * @returns 競合マップ
 */
/**
 * VFSから競合配列取得
 * @param vfs - VirtualFS
 * @returns 競合配列
 */
async function fetchConflictsArray(vfs: any): Promise<ConflictTriple[]> {
  try {
    if (typeof vfs.getConflicts === 'function') return await vfs.getConflicts() || []
  } catch (e) {
    console.error('vfs.getConflicts failed', e)
  }
  return []
}

/**
 * 競合配列をマップ化
 * @param conflictsArr - 競合配列
 * @returns 競合マップ
 */
function mapConflictsByKey(conflictsArr: ConflictTriple[]): Record<string, ConflictTriple> {
  const incomingConflicts: Record<string, ConflictTriple> = {}
  for (const v of conflictsArr) {
    const key = (v && typeof v.id === 'string' ? v.id : null) || (v && typeof v.path === 'string' ? v.path : '')
    if (!key) continue
    incomingConflicts[key] = v
  }
  return incomingConflicts
}

/**
 * VFSから競合マップ取得
 * @param vfs - VirtualFS
 * @returns 競合マップ
 */
async function getIncomingConflictsMap(vfs: any): Promise<Record<string, ConflictTriple>> {
  const incomingConflictsArr = await fetchConflictsArray(vfs)
  return mapConflictsByKey(incomingConflictsArr)
}

/**
 * 初期化が必要か判定
 * @param metadata - メタデータ
 * @returns 初期化必要ならtrue
 */
function needsInitialization(metadata: any): boolean {
  return !metadata.headSha || (Array.isArray(metadata.files) && metadata.files.length === 0)
}

/**
 * 競合なしの場合にpush
 * @param vfs - VirtualFS
 * @param conflictsKeys - 競合キー
 * @returns push結果
 */
async function pushChangesIfNoConflicts(vfs: any, conflictsKeys: string[]): Promise<any> {
  if (conflictsKeys.length !== 0 || typeof vfs.getChangeSet !== 'function') return null
  try {
    const changes = await vfs.getChangeSet()
    if (!Array.isArray(changes) || changes.length === 0) return null
    if (typeof vfs.getIndex !== 'function' || typeof vfs.push !== 'function') return null
    const idx = await vfs.getIndex()
    const parentSha = idx?.head || null
    try {
      return await vfs.push({ parentSha, message: 'UI sync', changes })
    } catch (e) {
      console.error('vfs.push failed', e)
      const errorMsg = (typeof e === 'object' && e !== null && 'message' in e) ? String((e as any).message) : String(e)
      return { ok: false, error: errorMsg }
    }
  } catch (e) {
    console.error('push flow failed', e)
    return null
  }
}

/**
 * 処理名: メタデータストア
 *
 * 処理概要: プロジェクト単位のメタデータ（競合data・リポ設定・同期状態）を管理
 *
 * 実装理由: projectStore から メタデータ管理責務を分離し、選択状態のみに限定するため
 */
export const useMetadataStore = defineStore('metadata', {
  /**
   * ステート定義
   * @returns 初期ステート
   */
  state: () => ({
    repoConfigs: {} as Record<string, RepoConfig>,
    conflictData: {} as Record<string, Record<string, ConflictTriple>>,
    resolvedData: {} as Record<string, string[]>
  }),

  actions: {
    /**
     * 処理名: OPFS ディレクトリハンドル取得
     * @param project プロジェクト名
     * @returns ディレクトリハンドル
     */
    async getProjectDirHandle(project: string) {
      const root = await (navigator as any).storage.getDirectory()
      const ROOT_DIR = 'data-mgmt-system'
      const dir = await root.getDirectoryHandle(ROOT_DIR, { create: true })
      return await dir.getDirectoryHandle(project, { create: true })
    },

    /**
     * 処理名: プロジェクト内 JSON ファイル読み込み
     * @param project プロジェクト名
     * @param filename ファイル名
     * @returns パース済みJSON、存在しない場合null
     */
    async readProjectJson<T = any>(project: string, filename: string): Promise<T | null> {
      try {
        const proj = await this.getProjectDirHandle(project)
        const fh = await proj.getFileHandle(filename)
        const file = await fh.getFile()
        const text = await file.text()
        return JSON.parse(text) as T
      } catch (e: any) {
        if (e && e.name === 'NotFoundError') return null
        return null
      }
    },

    /**
     * 処理名: プロジェクト内ファイル原子的書き込み（JSON）
     * @param project プロジェクト名
     * @param filename ファイル名
     * @param data 書き込みデータ
     */
    async writeProjectJsonAtomic(project: string, filename: string, data: any) {
      const proj = await this.getProjectDirHandle(project)
      const tempName = `${filename}.tmp`
      let oldText: string | null = null
      try {
        try {
          const oldHandle = await proj.getFileHandle(filename)
          oldText = await (await oldHandle.getFile()).text()
        } catch (e) {
          console.warn('[metadataStore] read old file failed:', e)
          oldText = null
        }

        const tmp = await proj.getFileHandle(tempName, { create: true })
        const writable = await tmp.createWritable()
        await writable.write(JSON.stringify(data, null, 2))
        await writable.close()
        await proj.removeEntry(filename).catch(() => {})
        await proj.rename?.(tempName, filename).catch(() => {})
        try {
          const finalHandle = await proj.getFileHandle(filename, { create: true })
          const finalWritable = await finalHandle.createWritable()
          await finalWritable.write(JSON.stringify(data, null, 2))
          await finalWritable.close()
          await proj.removeEntry(tempName).catch(() => {})
        } catch (e) {
          console.warn('[metadataStore] saveMetadata final write error:', e)
        }
      } catch (e) {
        try {
          if (oldText !== null) {
            const finalHandle = await proj.getFileHandle(filename, { create: true })
            const w = await finalHandle.createWritable()
            await w.write(oldText)
            await w.close()
          }
        } catch (e2) {
          console.error('rollback failed', e2)
        }
        throw e
      }
    },

    /**
     * 処理名: プロジェクト内ファイル原子的書き込み（テキスト）
     * @param project プロジェクト名
     * @param filename ファイル名
     * @param text テキスト内容
     */
    async writeProjectFile(project: string, filename: string, text: string) {
      const proj = await this.getProjectDirHandle(project)
      const tempName = `${filename}.tmp`
      let oldText: string | null = null
      try {
        try {
          const oldHandle = await proj.getFileHandle(filename)
          oldText = await (await oldHandle.getFile()).text()
        } catch (e) {
          console.warn('[metadataStore] read old file failed:', e)
          oldText = null
        }

        const tmp = await proj.getFileHandle(tempName, { create: true })
        const writable = await tmp.createWritable()
        await writable.write(text)
        await writable.close()
        await proj.removeEntry(filename).catch(() => {})
        await proj.rename?.(tempName, filename).catch(() => {})
        try {
          const finalHandle = await proj.getFileHandle(filename, { create: true })
          const finalWritable = await finalHandle.createWritable()
          await finalWritable.write(text)
          await finalWritable.close()
          await proj.removeEntry(tempName).catch(() => {})
        } catch (e) {
          console.warn('[metadataStore] saveRawContent final write error:', e)
        }
      } catch (e) {
        try {
          if (oldText !== null) {
            const finalHandle = await proj.getFileHandle(filename, { create: true })
            const w = await finalHandle.createWritable()
            await w.write(oldText)
            await w.close()
          }
        } catch (e2) {
          console.error('[metadataStore] rollback failed:', e2)
        }
        throw e
      }
    },

    /**
     * 処理名: リポ設定読み込み
     * @param project プロジェクト名
     * @returns リポ設定
     */
    async loadRepoConfig(project: string) {
      let openedHere = false
      try {
        const { vfs, openedHere: opened } = await getCurrentOrOpenVfs(project)
        openedHere = opened
        const { adapter, openedHere: openedAfter } = await getAdapterWithFallback(project, vfs, openedHere)
        openedHere = openedAfter
        if (!adapter) return null

        // convert AdapterMeta -> RepoConfig for UI
        const cfg = buildRepoConfigFromAdapter(adapter)
        this.repoConfigs[project] = cfg
        return cfg
      } catch (e) {
        console.warn('[metadataStore] loadRepoConfig error:', e)
        return null
      } finally {
        if (openedHere) {
          try {
            virtualFsManager.closeProject()
          } catch (e) {
            console.warn('[metadataStore] loadRepoConfig closeProject error:', e)
          }
        }
      }
    },

    /**
     * 処理名: リポ設定取得
     * @param project プロジェクト名
     * @returns リポ設定
     */
    async getRepoConfig(project: string) {
      if (this.repoConfigs[project]) return this.repoConfigs[project]
      return await this.loadRepoConfig(project)
    },

    /**
     * 処理名: リポ設定保存
     * @param project プロジェクト名
     * @param cfg リポ設定オブジェクト
     */
    async saveRepoConfig(project: string, cfg: RepoConfig) {
      // Keep in-memory cache
      this.repoConfigs[project] = cfg
      // Persist to VirtualFS adapter instead of OPFS file
      // Build AdapterMeta from RepoConfig
      /**
       * RepoConfigからAdapterMetaを構築
       * @param rc - リポ設定
       * @returns アダプターメタ情報
       */
      const buildAdapter = (rc: RepoConfig) => {
        if (rc.provider === 'gitlab') {
          // For gitlab, use projectId = owner/repository
          return { type: 'gitlab', opts: { projectId: `${rc.owner}/${rc.repository}`, host: rc.host || 'gitlab.com', token: rc.token, branch: rc.branch || 'main' } }
        }
        // default to github
        return { type: 'github', opts: { owner: rc.owner, repo: rc.repository, token: rc.token, branch: rc.branch || 'main' } }
      }

      const adapterPayload = buildAdapter(cfg)

      // First try using currently opened VFS
      try {
        const vfs: any = virtualFsManager.getCurrentVfs()
        if (vfs && typeof vfs.setAdapter === 'function') {
          // browser-git-ops v0.0.5 expects signature setAdapter(null, meta)
          await vfs.setAdapter(null, adapterPayload)
          return
        }
      } catch (e) {
        console.warn('[metadataStore] current VFS setAdapter error:', e)
      }

      // If no current VFS, open the project temporarily to set adapter
      let openedHere = false
      try {
        const tmpVfs: any = await virtualFsManager.openProject(project)
        openedHere = true
        if (tmpVfs && typeof tmpVfs.setAdapter === 'function') {
          await tmpVfs.setAdapter(null, adapterPayload)
        } else {
          console.warn('VirtualFS.setAdapter is not available on opened VFS')
        }
      } catch (e) {
        console.error('saveRepoConfig failed to set adapter on VirtualFS', e)
        throw e
      } finally {
        if (openedHere) {
          try {
            virtualFsManager.closeProject()
          } catch (e) {
            console.warn('[metadataStore] saveRepoConfig closeProject error:', e)
          }
        }
      }
    },

    /**
     * 処理名: 競合データ読み込み
     *
     * 処理概要: VirtualFS から競合情報を取得してストアに保存
     *
     * @param project プロジェクト名
     * @returns 競合マップ
     */
    async loadConflictData(project: string) {
      if (!project) {
        console.warn('プロジェクトが指定されていません（loadConflictData）')
        return null
      }

      try {
        const vfs: any = virtualFsManager.getCurrentVfs()
        if (!vfs || typeof vfs.getConflicts !== 'function') {
          console.info('VirtualFS.getConflicts が利用不可（競合データなし）')
          return {}
        }

        // VirtualFS から ConflictItem[] を取得
        const conflictsArr = await vfs.getConflicts()
        if (!Array.isArray(conflictsArr)) {
          return {}
        }

        const conflictMap = buildConflictMap(conflictsArr)

        // ストアに保存
        this.conflictData[project] = conflictMap
        return conflictMap
      } catch (e) {
        console.error('loadConflictData failed', e)
        return {}
      }
    },

    /**
     * 処理名: 競合解決
     *
     * 処理概要: 指定パスの競合を VirtualFS 経由で解決し、ストアから削除
     *
     * @param project プロジェクト名
     * @param path 競合ファイルパス
     * @param resolution 'local' または 'remote'
     */
    async resolveConflict(project: string, path: string, resolution: 'local' | 'remote') {
      if (!project) throw new Error('プロジェクトが指定されていません')
      if (!path) throw new Error('パスが指定されていません')

      try {
        const vfs: any = virtualFsManager.getCurrentVfs()
        if (!vfs || typeof vfs.resolveConflict !== 'function') {
          throw new Error('VirtualFS.resolveConflict が利用不可')
        }

        // VirtualFS で競合を解決
        await vfs.resolveConflict(path, resolution)

        // ストア内の競合マップから該当エントリを削除
        removeConflictByPath(this.conflictData, project, path)

        // 解決済みリストに追加
        addResolvedPath(this.resolvedData, project, path)

        console.info(`競合を解決しました: ${path} (${resolution})`)
      } catch (e) {
        console.error('resolveConflict failed', e)
        throw e
      }
    },

    /**
     * 処理名: 競合をローカルストアから削除
     *
     * 処理概要: 指定キーの競合データをストアから削除（削除済みリストに追加）
     *
     * @param project プロジェクト名
     * @param keyId 競合のキーID（id または path）
     */
    async removeConflict(project: string, keyId: string) {
      if (!project) throw new Error('プロジェクトが指定されていません')
      if (!keyId) throw new Error('キーIDが指定されていません')

      try {
        if (this.conflictData[project] && this.conflictData[project][keyId]) {
          const conflict = this.conflictData[project][keyId]
          // ストアから削除
          delete this.conflictData[project][keyId]

          // 削除済みリストに追加
          if (!this.resolvedData[project]) {
            this.resolvedData[project] = []
          }
          if (conflict.path && !this.resolvedData[project].includes(conflict.path)) {
            this.resolvedData[project].push(conflict.path)
          }

          console.info(`競合をローカルストアから削除しました: ${keyId}`)
        }
      } catch (e) {
        console.error('removeConflict failed', e)
        throw e
      }
    },

    /**
     * 処理名: キーIDで競合情報を取得
     *
     * 処理概要: 指定されたキーIDに対応する競合情報をストアから取得する
     *
     * @param project プロジェクト名
     * @param keyId キーID
     * @returns 該当する競合情報、見つからない場合は null
     */
    async getConflictFor(project: string, keyId: string): Promise<ConflictTriple | null> {
      if (!project || !keyId) return null

      try {
        if (this.conflictData[project] && this.conflictData[project][keyId]) {
          return this.conflictData[project][keyId]
        }
        return null
      } catch (e) {
        console.error('getConflictFor failed', e)
        return null
      }
    },

    /**
     * 処理名: プロジェクト同期
     *
     * 処理概要: リモートと同期してメタデータ・競合情報を更新する
     *
     * @param project プロジェクト名
     */
    /**
     * 処理名: プロジェクト同期
     * @param project - プロジェクト名
     * @returns 同期結果
     */
    async syncProject(project: string) {
      if (!project) throw new Error('project is required')

      const cfg = this.repoConfigs[project] || (await this.loadRepoConfig(project))
      if (!cfg) {
        console.info('リポジトリ設定が未保存のため同期をスキップしました')
        return { metadata: null, resolved: [], conflicts: [], needsInit: false }
      }

      // Prefer using VirtualFS APIs for pull/merge/push flows
      const vfs: any = virtualFsManager.getCurrentVfs()
      if (!vfs) throw new Error('VirtualFS is not available')

      await ensureAdapterOnVfs(vfs, cfg)
      await pullVfsSafe(vfs)
      const metadata = await buildMetadataFromVfs(vfs)

      const existing = (this.conflictData[project]) ? this.conflictData[project] : await this.loadConflictData(project) || {}
      const incomingConflicts = await getIncomingConflictsMap(vfs)

      const merged = mergeConflictsMaps(existing, incomingConflicts)
      // Do not persist to OPFS; keep VFS as authority and in-memory map for UI
      this.conflictData[project] = merged

      const resolved: string[] = [] // resolved list is managed by VFS/push outcome
      const conflictsKeys = Object.keys(incomingConflicts || {})
      const needsInit = needsInitialization(metadata)
      const pushResults = await pushChangesIfNoConflicts(vfs, conflictsKeys)

      return { metadata, resolved, conflicts: conflictsKeys, needsInit, pushResults }
    }
  }
})
