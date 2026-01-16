import { defineStore } from 'pinia'

export const useProjectStore = defineStore('project', {
  /**
   * state: ストアの初期状態を返す
   * @returns 初期 state オブジェクト
   */
  state: () => ({
    projects: [] as string[],
    selectedProject: ((typeof localStorage !== 'undefined' && localStorage.getItem('selectedProject')) || null) as string | null,
    loading: false
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
  }
})
