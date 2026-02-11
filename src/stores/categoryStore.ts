import { defineStore } from 'pinia';
import { createRepositories } from '../repositories';
import type { CategoryMaster, VirtualFsInstance } from '../types/models';
import { generateUUID } from '../lib/uuid';

export interface CategoryNode extends CategoryMaster {
  children?: CategoryNode[];
}

/**
 * 処理名: カテゴリーストア
 *
 * 処理概要: カテゴリーの一覧管理、木構造変換、追加・更新・削除処理を提供する Pinia ストア
 *
 * 実装理由: カテゴリ操作の状態管理と永続化を一元化するため
 */
/**
 * 処理名: カテゴリーストアエクスポート
 *
 * 処理概要: カテゴリ一覧の取得・追加・更新・削除を提供する Pinia ストアをエクスポートする
 *
 * 実装理由: カテゴリ操作の状態管理と永続化を一元化するため
 */
export const useCategoryStore = defineStore('category', {
  /**
   * ストア状態の初期値
   * @returns 初期 state オブジェクト
   */
  state: () => ({
    categories: [] as CategoryMaster[],
    loading: false,
    initialized: false,
    _categoryRepository: null as any
  }),
  getters: {
    /**
     * 処理名: 木構造取得
     * @returns CategoryNode[]
     */
    getTree(): CategoryNode[] {
      /**
       * 処理名: 木構築ヘルパー
       * @param parentId 親カテゴリ ID（ルートなら null）
       * @returns CategoryNode[] 指定親の子ノード配列
       */
      const buildTree = (parentId: string | null): CategoryNode[] => {
        return this.categories
          .filter(c => c.ParentID === parentId)
          .map(c => ({
            ...c,
            children: buildTree(c.ID)
          }));
      };
      return buildTree(null);
    },
    // IDからパス名を取得するヘルパーなど
    /**
     * 処理名: パスマップ取得
     * @returns Record<string,string>
     */
    getPathMap(): Record<string, string> {
       const map: Record<string, string> = {};
       for(const c of this.categories) {
         map[c.ID] = c.Path + '/' + c.Name; // 簡易
       }
       return map; 
    },
    /**
     * 処理名: フルパス取得
     * @returns (id: string) => string ルートからのスラッシュ区切りパス
     */
    getFullPath(): (id: string) => string {
      const map: Record<string, CategoryMaster> = this.getMap;
      return (id: string) => {
        if (!id) return '';
        const parts: string[] = [];
        let cur = map[id];
        if (!cur) return id;
        while (cur) {
          parts.unshift(cur.Name);
          if (!cur.ParentID) break;
          cur = map[cur.ParentID];
        }
        return parts.join('/');
      };
    },
    /**
     * 処理名: ID->Category マップ取得
     * @returns Record<string,CategoryMaster>
     */
    getMap(): Record<string, CategoryMaster> {
      const map: Record<string, CategoryMaster> = {};
      for(const c of this.categories) {
        map[c.ID] = c;
      }
      return map;
    }
  },
  actions: {
    /**
     * 処理名: VirtualFS から初期化
     *
     * 処理概要: プロジェクト選択時に VirtualFS インスタンスを受け取り、リポジトリを初期化する
     *
     * 実装理由: プロジェクト単位のリポジトリ分離を実現するため
     * @param vfs VirtualFsInstance（オープン済み）
     */
    initFromVirtualFS(vfs: VirtualFsInstance) {
      const repos = createRepositories(vfs);
      this._categoryRepository = repos.categoryRepository;
      this.initialized = false;  // リセット
    },

    /**
     * 処理名: 初期化
     *
     * 処理概要: initFromVirtualFS 後にデータをロードしてストアを初期化する
     *
     * 実装理由: 初回アクセス時のセットアップを行うため
     */
    async init() {
      if (this.initialized || !this._categoryRepository) return;
      await this.fetchAll();
      this.initialized = true;
      
      // データが無い場合、ルート要素的なものを作るなど初期化
      if (this.categories.length === 0) {
        // 必要なら初期データ投入
      }
    },
    /**
     * 処理名: 全件取得
     *
     * 処理概要: 永続化レイヤーからカテゴリデータを取得し状態を更新する
     *
     * 実装理由: UI での表示に必要なデータを提供するため
     */
    async fetchAll() {
      this.loading = true;
      try {
        this.categories = await this._categoryRepository.getAll();
      } finally {
        this.loading = false;
      }
    },
    /**
     * 処理名: 追加
     *
     * 処理概要: 部分的なカテゴリー情報を受け取り、新規カテゴリーを作成して保存する
     *
     * 実装理由: カテゴリ作成機能を提供するため
      * @param partial 新規作成に用いるカテゴリーの部分情報
     */
    async add(partial: Omit<CategoryMaster, 'ID' | 'CreateTimestamp' | 'LastUpdatedBy'>) {
      const newCat: CategoryMaster = {
        ID: generateUUID(),
        ...partial
      };
      await this._categoryRepository.save(newCat);
      await this.fetchAll();
    },
    /**
     * 処理名: 更新
     *
     * 処理概要: 指定のカテゴリーを保存して一覧を更新する
     *
     * 実装理由: 編集操作を永続化するため
      * @param category 更新対象の `CategoryMaster` オブジェクト
     */
    async update(category: CategoryMaster) {
      await this._categoryRepository.save(category);
      await this.fetchAll();
    },
    /**
     * 処理名: 削除
     *
     * 処理概要: 指定IDのカテゴリーを削除し一覧を更新する
     *
     * 実装理由: カテゴリの削除操作を提供するため
      * @param id 削除対象のカテゴリー ID
     */
    async remove(id: string) {
      // 子要素チェックなどはアプリロジックでやるべきだが、ここでは単純削除
      await this._categoryRepository.delete(id);
      await this.fetchAll();
    }
  }
});
