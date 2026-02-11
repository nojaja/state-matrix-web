import { defineStore } from 'pinia'
import { mergeConflictsMaps } from '../lib/repoSync'
import type { RepoConfig, ConflictTriple, RepoMetadata } from '../types/models'
import { virtualFsManager } from '../lib/virtualFsSingleton'
export type { RepoConfig, ConflictTriple, RepoMetadata }

/**
 * 処理名: メタデータストア
 *
 * 処理概要: プロジェクト単位のメタデータ（競合data・リポ設定・同期状態）を管理
 *
 * 実装理由: projectStore から メタデータ管理責務を分離し、選択状態のみに限定するため
 */
export const useMetadataStore = defineStore('metadata', {
  state: () => ({
    repoConfigs: {} as Record<string, RepoConfig>,
    conflictData: {} as Record<string, Record<string, ConflictTriple>>,
    resolvedData: {} as Record<string, string[]>
  }),

  actions: {
    /**
     * 処理名: OPFS ディレクトリハンドル取得
     * @param project プロジェクト名
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
        } catch (_e) {
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
        } catch (_e) {
          // ignore
        }
      } catch (e) {
        try {
          if (oldText !== null) {
            const finalHandle = await proj.getFileHandle(filename, { create: true })
            const w = await finalHandle.createWritable()
            await w.write(oldText)
            await w.close()
          }
        } catch (_e) {
          console.error('rollback failed', _e)
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
        } catch (_e) {
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
        } catch (_e) {
          // ignore
        }
      } catch (e) {
        try {
          if (oldText !== null) {
            const finalHandle = await proj.getFileHandle(filename, { create: true })
            const w = await finalHandle.createWritable()
            await w.write(oldText)
            await w.close()
          }
        } catch (_e) {
          console.error('rollback failed', _e)
        }
        throw e
      }
    },

    /**
     * 処理名: リポ設定読み込み
     * @param project プロジェクト名
     */
    async loadRepoConfig(project: string) {
      let openedHere = false
      try {
        // Try current VFS first
        let vfs: any = virtualFsManager.getCurrentVfs()

        // If no current VFS, open the project temporarily
        if (!vfs) {
          try {
            vfs = await virtualFsManager.openProject(project)
            openedHere = true
          } catch (_e) {
            // cannot open project
            return null
          }
        }

        if (!vfs || typeof vfs.getAdapter !== 'function') return null

        let adapter: any = null
        try {
          adapter = await vfs.getAdapter()
        } catch (_e) {
          adapter = null
        }

        // If adapter not found and we didn't open the project here, try opening it
        if (!adapter && !openedHere) {
          try {
            vfs = await virtualFsManager.openProject(project)
            openedHere = true
            adapter = await vfs.getAdapter()
          } catch (_e) {
            adapter = null
          }
        }

        if (adapter) {
          // convert AdapterMeta -> RepoConfig for UI
          const opts = (adapter.opts || {}) as Record<string, any>
          const cfg: RepoConfig = {
            provider: adapter.type === 'gitlab' ? 'gitlab' : 'github',
            owner: opts.owner || (typeof opts.projectId === 'string' ? (opts.projectId.split('/')?.[0] || '') : ''),
            repository: opts.repo || (typeof opts.projectId === 'string' ? (opts.projectId.split('/')?.[1] || '') : ''),
            branch: opts.branch || 'main',
            host: opts.host || undefined,
            token: opts.token || undefined,
            lastSyncedCommitSha: null
          }
          this.repoConfigs[project] = cfg
          return cfg
        }

        return null
      } catch (_e) {
        return null
      } finally {
        if (openedHere) {
          try {
            virtualFsManager.closeProject()
          } catch (_e) {
            // ignore
          }
        }
      }
    },

    /**
     * 処理名: リポ設定取得
     * @param project プロジェクト名
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
      } catch (_e) {
        // no open VFS, fall through to open temporarily
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
          } catch (_e) {
            // ignore
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

        // ConflictItem[] を Record<key, ConflictTriple> にマッピング
        const conflictMap: Record<string, ConflictTriple> = {}
        for (const item of conflictsArr) {
          if (!item) continue

          // キーは id 優先、なければ path
          const key = (typeof item.id === 'string' && item.id) || (typeof item.path === 'string' && item.path) || ''
          if (!key) continue

          // ConflictTriple 形式にマッピング（VirtualFS の ConflictItem をそのまま利用）
          conflictMap[key] = {
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
        if (this.conflictData[project]) {
          for (const key of Object.keys(this.conflictData[project])) {
            const conflict = this.conflictData[project][key]
            if (conflict && conflict.path === path) {
              delete this.conflictData[project][key]
              break
            }
          }
        }

        // 解決済みリストに追加
        if (!this.resolvedData[project]) {
          this.resolvedData[project] = []
        }
        if (!this.resolvedData[project].includes(path)) {
          this.resolvedData[project].push(path)
        }

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

      // Ensure adapter is configured on the VFS
      try {
        const adapterOnVfs = typeof vfs.getAdapter === 'function' ? await vfs.getAdapter() : null
        if ((!adapterOnVfs || !adapterOnVfs.type) && cfg) {
          // Build adapter payload from RepoConfig
          const buildAdapter = (rc: RepoConfig) => {
            if (rc.provider === 'gitlab') return { type: 'gitlab', opts: { projectId: `${rc.owner}/${rc.repository}`, host: rc.host || 'gitlab.com', token: rc.token, branch: rc.branch || 'main' } }
            return { type: 'github', opts: { owner: rc.owner, repo: rc.repository, token: rc.token, branch: rc.branch || 'main' } }
          }
          const adapterPayload = buildAdapter(cfg)
          if (typeof vfs.setAdapter === 'function') {
            // browser-git-ops setAdapter signature may accept (null, meta)
            try { await vfs.setAdapter(null, adapterPayload) } catch (_) { await vfs.setAdapter(adapterPayload) }
          }
        }
      } catch (e) {
        console.warn('failed to ensure adapter on VFS', e)
      }

      // Pull remote into VFS (this populates VFS internal index/state)
      if (typeof vfs.pull === 'function') {
        try { await vfs.pull() } catch (e) { console.error('vfs.pull failed', e) }
      }

      // Obtain metadata and conflicts from VFS
      let metadata: any = { headSha: null, files: [], updatedAt: new Date().toISOString() }
      try {
        const statInfo = typeof vfs.stat === 'function' ? await vfs.stat('.') : null
        const idx = typeof vfs.getIndex === 'function' ? await vfs.getIndex() : null
        metadata = { headSha: idx?.head || null, files: idx?.files || [], updatedAt: new Date().toISOString(), stat: statInfo }
      } catch (e) {
        // ignore
      }

      const existing = (this.conflictData[project]) ? this.conflictData[project] : await this.loadConflictData(project) || {}

      // Get conflicts from VFS (array) and convert to map
      let incomingConflictsArr: ConflictTriple[] = []
      try {
        if (typeof vfs.getConflicts === 'function') incomingConflictsArr = await vfs.getConflicts() || []
      } catch (e) {
        console.error('vfs.getConflicts failed', e)
        incomingConflictsArr = []
      }
      const incomingConflicts: Record<string, ConflictTriple> = {}
      for (const v of incomingConflictsArr) {
        const key = (v && typeof v.id === 'string' ? v.id : null) || (v && typeof v.path === 'string' ? v.path : '')
        incomingConflicts[key] = v
      }

      const merged = mergeConflictsMaps(existing, incomingConflicts)
      // Do not persist to OPFS; keep VFS as authority and in-memory map for UI
      this.conflictData[project] = merged

      const resolved: string[] = [] // resolved list is managed by VFS/push outcome
      const conflictsKeys = Object.keys(incomingConflicts || {})
      const needsInit = !metadata.headSha || (Array.isArray(metadata.files) && metadata.files.length === 0)

      // If there are no conflicts, attempt to push local changes via VFS
      let pushResults: any = null
      try {
        if (conflictsKeys.length === 0 && typeof vfs.getChangeSet === 'function') {
          const changes = await vfs.getChangeSet()
          if (Array.isArray(changes) && changes.length > 0 && typeof vfs.getIndex === 'function' && typeof vfs.push === 'function') {
            const idx = await vfs.getIndex()
            const parentSha = idx?.head || null
            try {
              pushResults = await vfs.push({ parentSha, message: 'UI sync', changes })
            } catch (e) {
              console.error('vfs.push failed', e)
              const errorMsg = (typeof e === 'object' && e !== null && 'message' in e) ? String((e as any).message) : String(e)
              pushResults = { ok: false, error: errorMsg }
            }
          }
        }
      } catch (e) {
        console.error('push flow failed', e)
      }

      return { metadata, resolved, conflicts: conflictsKeys, needsInit, pushResults }
    }
  }
})
