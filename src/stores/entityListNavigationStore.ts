import { defineStore } from 'pinia';

type CategoryForNavigation = {
  ID: string;
  ParentID: string | null;
};

/**
 * 処理名: EntityListナビゲーションストア
 *
 * 処理概要: EntityListSectionのカレントカテゴリを画面横断で共有し、
 *          カテゴリ遷移操作を一元管理する。
 */
export const useEntityListNavigationStore = defineStore('entityListNavigation', {
  /**
   * 処理名: ストア状態初期化
   *
   * 処理概要: EntityListナビゲーションの初期状態を返却する。
    * @returns EntityListナビゲーションの初期状態
   */
  state: () => ({
    currentCategoryId: null as string | null,
    initialized: false
  }),
  actions: {
    /**
     * 処理名: 初期ルート保証
     *
     * 処理概要: 初回のみカレントカテゴリをルートへ初期化する。
     */
    ensureInitialRoot() {
      if (this.initialized) return;
      this.currentCategoryId = null;
      this.initialized = true;
    },

    /**
     * 処理名: カレントカテゴリ設定
     * @param categoryId 設定対象カテゴリID（nullはルート）
     */
    setCurrentCategory(categoryId: string | null) {
      this.currentCategoryId = categoryId;
    },

    /**
     * 処理名: 親カテゴリへ移動
     * @param categories カテゴリ一覧
     */
    moveToParent(categories: CategoryForNavigation[]) {
      if (!this.currentCategoryId) return;
      const current = categories.find(c => c.ID === this.currentCategoryId);
      this.currentCategoryId = current?.ParentID ?? null;
    },

    /**
     * 処理名: ルートへリセット
     */
    resetToRoot() {
      this.currentCategoryId = null;
    }
  }
});