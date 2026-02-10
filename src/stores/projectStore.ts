import { defineStore } from 'pinia'
import RepositoryWorkerClient from '../lib/repositoryWorkerClient'
import { mergeConflictsMaps } from '../lib/repoSync'
import type { RepoConfig, ConflictTriple, RepoMetadata } from '../types/models'
export type { RepoConfig, ConflictTriple, RepoMetadata }

export const useProjectStore = defineStore('project', {
  /**
   * state: ストアの初期状態を返す
   * @returns 初期 state オブジェクト
   */
  state: () => ({
    projects: [] as string[],
    selectedProject: ((typeof localStorage !== 'undefined' && localStorage.getItem('selectedProject')) || null) as string | null,
    loading: false
    ,
    repoConfigs: {} as Record<string, RepoConfig>,
    conflictData: {} as Record<string, Record<string, ConflictTriple>>,
    resolvedData: {} as Record<string, string[]>
  }),
  actions: {
    /**
     * 処理名: プロジェクト一覧取得
     *
     * 処理概要: ファイルシステムからプロジェクトディレクトリを列挙して `projects` を更新する
     */
    async fetchAll() {
      this.loading = true
      try {
        const root = await (navigator as any).storage.getDirectory()
        const ROOT_DIR = 'data-mgmt-system'
        const dir = await root.getDirectoryHandle(ROOT_DIR, { create: true })
        const list: string[] = []
        // @ts-ignore
        for await (const [name, handle] of dir.entries()) {
          if (handle.kind === 'directory') list.push(name)
        }
        this.projects = list
        // Best-effort: load repo configs and conflict data for each project
        for (const p of list) {
          try {
            await this.loadRepoConfig(p)
          } catch (e) {
            // ignore per-project errors
          }
          try {
            await this.loadConflictData(p)
          } catch (e) {
            // ignore
          }
        }
      } catch (e) {
        console.error('プロジェクト一覧取得エラー', e)
        this.projects = []
      } finally {
        this.loading = false
      }
    },
    /**
     * 処理名: プロジェクト作成
     * @param name 作成するプロジェクト名
     */
    async createProject(name: string) {
      if (!name || !name.trim()) throw new Error('名前を入力してください')
      const root = await (navigator as any).storage.getDirectory()
      const ROOT_DIR = 'data-mgmt-system'
      const dir = await root.getDirectoryHandle(ROOT_DIR, { create: true })
      await dir.getDirectoryHandle(name, { create: true })
      await this.fetchAll()
      this.selectProject(name)
    },
    /**
     * 処理名: プロジェクト選択
     * @param name 選択するプロジェクト名、`null` で未選択にする
     */
    selectProject(name: string | null) {
      this.selectedProject = name
      try {
        if (typeof localStorage !== 'undefined') {
          if (name) localStorage.setItem('selectedProject', name)
          else localStorage.removeItem('selectedProject')
        }
      } catch (_e) {
        // ignore in non-browser test env
      }
    },
    /**
     * 処理名: 選択クリア
     */
    clearSelection() {
      this.selectProject(null)
    }

    ,

    // --- OPFS helper functions ---
    /**
     *
     * @param project
     */
    async getProjectDirHandle(project: string) {
      const root = await (navigator as any).storage.getDirectory()
      const ROOT_DIR = 'data-mgmt-system'
      const dir = await root.getDirectoryHandle(ROOT_DIR, { create: true })
      return await dir.getDirectoryHandle(project, { create: true })
    },

    /**
     *
     * @param project
     * @param filename
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
        // If getFileHandle throws because missing, return null
        return null
      }
    },

    /**
     *
     * @param project
     * @param filename
     * @param data
     */
    async writeProjectJsonAtomic(project: string, filename: string, data: any) {
      const proj = await this.getProjectDirHandle(project)
      const tempName = `${filename}.tmp`
      let oldText: string | null = null
      try {
        // read old if exists
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
        // replace
        await proj.removeEntry(filename).catch(() => {})
        await proj.rename?.(tempName, filename).catch(() => {})
        // fallback: if rename not available, copy by creating new handle
        try {
          // create final file from temp
          const finalHandle = await proj.getFileHandle(filename, { create: true })
          const finalWritable = await finalHandle.createWritable()
          await finalWritable.write(JSON.stringify(data, null, 2))
          await finalWritable.close()
          // remove temp
          await proj.removeEntry(tempName).catch(() => {})
        } catch (_e) {
          // ignore
        }
      } catch (e) {
        // attempt rollback
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

    // write raw text atomically (for non-JSON files or raw content)
    /**
     *
     * @param project
     * @param filename
     * @param text
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

    // --- RepoConfig / ConflictData API ---
    /**
     *
     * @param project
     */
    async loadRepoConfig(project: string) {
      const res = (await (this.readProjectJson as any)(project, '.repo-config.json')) as RepoConfig | null
      if (res) this.repoConfigs[project] = res
      return res
    },
    
    /**
     *
     * @param project
     */
    async getRepoConfig(project: string) {
      if (this.repoConfigs[project]) return this.repoConfigs[project]
      return await this.loadRepoConfig(project)
    },

    /**
     *
     * @param project
     * @param cfg
     */
    async saveRepoConfig(project: string, cfg: RepoConfig) {
      this.repoConfigs[project] = cfg
      await this.writeProjectJsonAtomic(project, '.repo-config.json', cfg)
    },

    /**
     *
     * @param project
     */
    async loadConflictData(project: string) {
      const res = (await (this.readProjectJson as any)(project, '.repo-conflicts.json')) as Record<string, ConflictTriple> | null
      /**
       *
       * @param raw
       */
      const normalize = (raw: Record<string, ConflictTriple> | null) => {
        const out: Record<string, ConflictTriple> = {}
        if (!raw) return out
        const now = new Date().toISOString()
        for (const k of Object.keys(raw)) {
          const v = raw[k] as any
          // ensure shape
          const id = v && typeof v.id === 'string' ? v.id : (v && v.id == null ? null : String(v && v.id) )
          const path = v && typeof v.path === 'string' ? v.path : k
          const format = v && (v.format === 'json' || v.format === 'yaml' || v.format === 'text') ? v.format : 'text'
          const base = v && typeof v.base === 'string' ? v.base : (v && v.base != null ? String(v.base) : '')
          const local = v && typeof v.local === 'string' ? v.local : (v && v.local != null ? String(v.local) : '')
          const remote = v && typeof v.remote === 'string' ? v.remote : (v && v.remote != null ? String(v.remote) : '')
          const timestamp = v && typeof v.timestamp === 'string' ? v.timestamp : now
          out[id || path] = { id, path, format, base, local, remote, timestamp, metadata: v && v.metadata ? v.metadata : {} }
        }
        return out
      }

      const normalized = normalize(res)
      this.conflictData[project] = normalized
      return this.conflictData[project]
    },

    /**
     *
     * @param id
     */
    async removeConflict(id: string) {
      const project = this.selectedProject
      if (!project) throw new Error('プロジェクトが選択されてぁE��せん')
      // ensure conflictData loaded
      if (!this.conflictData[project]) await this.loadConflictData(project)
      const map = this.conflictData[project] || {}
      // delete by key if exists
      if (map[id]) {
        delete map[id]
      } else {
        // search value.id === id
        for (const k of Object.keys(map)) {
          const v = map[k]
          if (v && v.id === id) {
            delete map[k]
            break
          }
        }
      }
      // persist
      await this.writeProjectJsonAtomic(project, '.repo-conflicts.json', map)
      this.conflictData[project] = map
      // mark resolved
      if (!this.resolvedData[project]) this.resolvedData[project] = []
      if (!this.resolvedData[project].includes(id)) this.resolvedData[project].push(id)
      // persist resolved list
      await this.writeProjectJsonAtomic(project, '.repo-resolved.json', this.resolvedData[project])
    },

    /**
     *
     * @param id
     * @param _path
     */
    async markResolved(id: string, _path?: string) {
      const project = this.selectedProject
      if (!project) throw new Error('プロジェクトが選択されてぁE��せん')
      if (!this.resolvedData[project]) this.resolvedData[project] = []
      if (!this.resolvedData[project].includes(id)) this.resolvedData[project].push(id)
      await this.writeProjectJsonAtomic(project, '.repo-resolved.json', this.resolvedData[project])
    },

    /**
     *
     * @param project
     * @param id
     */
    async isResolved(project: string, id: string) {
      if (!project) return false
      if (!this.resolvedData[project]) {
        try {
          const resAny = await (this.readProjectJson as any)(project, '.repo-resolved.json')
          const res = Array.isArray(resAny) ? (resAny as string[]) : []
          this.resolvedData[project] = res || []
        } catch (_e) {
          this.resolvedData[project] = []
        }
      }
      return !!this.resolvedData[project] && this.resolvedData[project].includes(id)
    },

    /**
     *
     * @param project
     * @param keyOrId
     */
    async getConflictFor(project: string, keyOrId: string) {
      if (!project) return null
      if (!this.conflictData[project]) await this.loadConflictData(project)
      const map = this.conflictData[project] || {}
      // direct key lookup
      if (map[keyOrId]) return map[keyOrId]
      // search by id field
      for (const k of Object.keys(map)) {
        const v = map[k]
        if (v && v.id === keyOrId) return v
      }
      return null
    },

    /**
     * 処琁E��: リモートと同期してメタチE�Eタ・衝突情報を更新する
     * @param project プロジェクト名
     */
    async syncProject(project: string) {
      if (!project) throw new Error('project is required')
      // ensure repo config loaded
      const cfg = this.repoConfigs[project] || await this.loadRepoConfig(project)
      if (!cfg) throw new Error('Repo config is not set for project')

      const client = new RepositoryWorkerClient()
      // fetch remote tree
      const remote = (await client.fetchRemoteTree(cfg)) || { headSha: null, files: [] }

      // persist metadata
      const metadata = { headSha: remote.headSha, files: remote.files, updatedAt: new Date().toISOString() }
      await this.writeProjectJsonAtomic(project, '.repo-metadata.json', metadata)

      // Build triples: for each remote file, read local content if present; include local-only files when possible
      const projHandle = await this.getProjectDirHandle(project)
      const triples: Array<{ path: string; base: string | null; local: string | null; remote: string | null }> = []

      // Helper to safely read a file's text
      /**
       *
       * @param p
       */
      const readLocal = async (p: string) => {
        try {
          const fh = await projHandle.getFileHandle(p)
          const file = await fh.getFile()
          return await file.text()
        } catch (_e) {
          return null
        }
      }

      // Add remote files
      for (const rf of remote.files || []) {
        const localText = await readLocal(rf.path)
        // we don't have base content snapshot here, set base=null (worker/threeway can handle)
        triples.push({ path: rf.path, base: null, local: localText, remote: null })
      }

      // Try to include local-only files by iterating directory if supported
      if ((projHandle as any).entries) {
        // @ts-ignore
        for await (const [name, handle] of projHandle.entries()) {
          if (handle.kind === 'file') {
            if (!triples.find((t) => t.path === name)) {
              const txt = await readLocal(name)
              triples.push({ path: name, base: null, local: txt, remote: null })
            }
          }
        }
      }

      // Call threeway via client
      const result = await client.threeway(triples)

      const incomingConflicts: Record<string, ConflictTriple> = result.conflicts || {}
      // merge with existing conflicts by timestamp
      const existing = (this.conflictData[project]) ? this.conflictData[project] : await this.loadConflictData(project) || {}
      const merged = mergeConflictsMaps(existing, incomingConflicts)
      await this.writeProjectJsonAtomic(project, '.repo-conflicts.json', merged)
      this.conflictData[project] = merged

      const resolved = result.resolved || []
      const conflictsKeys = Object.keys(incomingConflicts || {})
      // Determine if remote appears uninitialized (needs initial push)
      const needsInit = !remote.headSha || (Array.isArray(remote.files) && remote.files.length === 0)

      let pushResults: { path: string; ok: boolean; message?: string }[] | null = null
      // Only attempt push when there are no newly detected conflicts
      if (conflictsKeys.length === 0 && resolved.length > 0 && cfg && cfg.provider) {
        const filesToPush: { path: string; content: string }[] = []
        for (const p of resolved) {
          const txt = await readLocal(p)
          if (txt != null) filesToPush.push({ path: p, content: txt })
        }
        if (filesToPush.length > 0) {
          try {
            pushResults = await client.pushPathsToRemote(cfg, filesToPush)
            // persist push results
            await this.writeProjectJsonAtomic(project, '.repo-push.json', { attemptedAt: new Date().toISOString(), results: pushResults })
          } catch (e) {
            // record failure
            pushResults = filesToPush.map(f => ({ path: f.path, ok: false, message: String((e as any).message || e) }))
            await this.writeProjectJsonAtomic(project, '.repo-push.json', { attemptedAt: new Date().toISOString(), results: pushResults })
          }
        }
      }

      // Normalize return to include metadata for callers/tests: { metadata, resolved, conflicts, needsInit }
      return { metadata, resolved, conflicts: conflictsKeys, needsInit }
    }
  }
})
