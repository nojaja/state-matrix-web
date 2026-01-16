import { defineStore } from 'pinia';
import { ArtifactRepository } from '../repositories';
import type { ArtifactType } from '../types/models';
import { generateUUID } from '../lib/uuid';

/**
 * 処理名: アーティファクトストア
 *
 * 処理概要: アプリケーション内のアーティファクト一覧の取得・追加・更新・削除を提供する Pinia ストア
 *
 * 実装理由: UI レイヤーと永続化レイヤーの間で状態管理を分離するため
 */
export const useArtifactStore = defineStore('artifact', {
  /**
   * ストア状態の初期値
   * @returns 初期 state オブジェクト
   */
  state: () => ({
    artifacts: [] as ArtifactType[],
    loading: false,
    initialized: false,
    draft: {
      ID: '',
      Name: '',
      Content: '',
      Note: '',
      CategoryID: ''
    } as Partial<ArtifactType> & { ID: string; Name: string; Content: string; Note: string; CategoryID: string },
  }),
  actions: {
    /**
     * 処理名: ドラフトを設定
     * @param partial ドラフトにマージする部分情報
     */
    setDraft(partial: Partial<ArtifactType> & { ID?: string }) {
      Object.assign(this.draft, partial);
    },
    /**
     * 処理名: アイテムをドラフトとして読み込む
     * @param item 読み込むアーティファクト
     */
    loadDraft(item: ArtifactType) {
      Object.assign(this.draft, item);
    },
    /**
     * 処理名: ドラフトを初期化する
     */
    resetDraft() {
      Object.assign(this.draft, { ID: '', Name: '', Content: '', Note: '', CategoryID: '' });
    },
    /**
     * 処理名: 初期化
     *
     * 処理概要: 初回ロード時にデータを取得して初期化する
     *
     * 実装理由: 重複した初期化処理を防ぐため
     */
    async init() {
      if (this.initialized) return;
      await this.fetchAll();
      this.initialized = true;
    },
    /**
     * 処理名: 全件取得
     *
     * 処理概要: 永続化レイヤーからアーティファクトを取得して状態を更新する
     *
     * 実装理由: UI の一覧表示にデータを提供するため
     */
    async fetchAll() {
      this.loading = true;
      try {
        this.artifacts = await ArtifactRepository.getAll();
      } finally {
        this.loading = false;
      }
    },
    /**
     * 処理名: 追加
     *
     * 処理概要: 部分的なアーティファクトデータを受け取り、ID 等を付与して保存する
     *
     * 実装理由: 新規作成機能を提供するため
     * @param partial 作成に必要な部分情報
     * @returns Promise<void>
     */
    async add(partial: Omit<ArtifactType, 'ID' | 'CreateTimestamp' | 'LastUpdatedBy'>) {
      const now = new Date().toISOString();
      const newItem: ArtifactType = {
        ID: generateUUID(),
        CreateTimestamp: now,
        LastUpdatedBy: 'User',
        ...partial
      };
      await ArtifactRepository.save(newItem);
      await this.fetchAll();
    },
    /**
     * 処理名: 更新
     *
     * 処理概要: 与えられたアイテムを保存して一覧を更新する
     *
     * 実装理由: 編集操作を永続化するため
     * @param item 更新対象のアイテム
     * @returns Promise<void>
     */
    async update(item: ArtifactType) {
      const updated = {
        ...item,
        LastUpdatedBy: 'User'
      }
      await ArtifactRepository.save(updated);
      await this.fetchAll();
    },
    /**
     * 処理名: 削除
     *
     * 処理概要: 指定 ID のアイテムを削除し一覧を更新する
     *
     * 実装理由: 削除操作を提供するため
     * @param id 削除対象の ID
     * @returns Promise<void>
     */
    async remove(id: string) {
      await ArtifactRepository.delete(id);
      await this.fetchAll();
    }
  }
});
