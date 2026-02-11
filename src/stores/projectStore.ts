import { defineStore } from 'pinia'

/**
 * 処理名: プロジェクト選択ストア
 *
 * 処理概要: 現在選択されているプロジェクト名を管理する Pinia ストア
 *
 * 実装理由: プロジェクト選択状態をグローバルに提供するため
 *
 * 注記: プロジェクト一覧管理、メタデータ管理は useMetadataStore で実行
 */
export const useProjectStore = defineStore('project', {
  state: () => ({
    selectedProject: ((typeof localStorage !== 'undefined' && localStorage.getItem('selectedProject')) || null) as string | null,
  }),

  actions: {
    /**
     * 処理名: プロジェクト選択
     *
     * 処理概要: プロジェクト名を選択状態に設定し localStorage に永続化
     *
     * 実装理由: プロジェクト切替時に選択状態を管理するため
     * @param name プロジェクト名、null で未選択
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
     *
     * 処理概要: プロジェクト選択をリセット
     *
     * 実装理由: プロジェクト終了時に状態をクリアするため
     */
    clearSelection() {
      this.selectProject(null)
    }
  }
})
