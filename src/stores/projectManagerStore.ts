import { defineStore } from 'pinia'

/**
 * 処理名: プロジェクト管理ストア
 *
 * 処理概要: プロジェクト一覧の取得と新規作成を提供する
 *
 * 実装理由: projectStore を選択状態のみに限定し、管理操作を分離するため
 */
export const useProjectManagerStore = defineStore('projectManager', {
  /**
   * ステート定義
   * @returns 初期ステート
   */
  state: () => ({
    projects: [] as string[],
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
    }
  }
})
