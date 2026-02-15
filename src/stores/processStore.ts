import { defineStore } from 'pinia';
import { createRepositories } from '../repositories';
import type { ProcessType } from '../types/models';
import type { VirtualFsInstance } from '../types/models';
import { generateUUID } from '../lib/uuid';

/**
 * 処理名: プロセスストア
 *
 * 処理概要: プロセス定義の一覧取得・追加・更新・削除を提供する Pinia ストア
 *
 * 実装理由: プロセス管理機能の状態を一元管理するため
 */
export const useProcessStore = defineStore('process', {
  /**
   * ストア状態の初期値
   * @returns 初期 state オブジェクト
   */
  state: () => ({
    _processRepository: null as any,
    processes: [] as ProcessType[],
    loading: false,
    initialized: false,
    draft: {
      ID: '',
      Name: '',
      Description: '',
      CategoryID: ''
    } as Partial<ProcessType> & { ID: string; Name: string; Description: string; CategoryID: string },
  }),
  actions: {
    /**
     * 処理名: VirtualFS から初期化
     *
     * 処理概要: VirtualFS インスタンスを受け取り、プロセスリポジトリを初期化する
     *
     * 実装理由: プロジェクト単位で VirtualFS インスタンスを分離管理するため
     * @param vfs VirtualFS インスタンス
     */
    initFromVirtualFS(vfs: VirtualFsInstance) {
      const repos = createRepositories(vfs);
      this._processRepository = repos.processRepository;
    },
    /**
     * 処理名: ドラフトを更新
     * @param partial ドラフトにマージする部分情報
     */
    setDraft(partial: Partial<ProcessType> & { ID?: string }) {
      Object.assign(this.draft, partial);
    },
    /**
     * 処理名: アイテムをドラフトとして読み込む
     * @param item 読み込むプロセス項目
     */
    loadDraft(item: ProcessType) {
      // preserve reactive reference
      Object.assign(this.draft, item);
    },
    /**
     * 処理名: ドラフトをリセットする
     */
    resetDraft() {
      Object.assign(this.draft, { ID: '', Name: '', Description: '', CategoryID: '' });
    },
    /**
     * 処理名: 初期化
     *
     * 処理概要: 初回ロード時にプロセス一覧を取得して初期化する
     *
     * 実装理由: 初期化処理の重複を防ぐため
     */
    async init() {
      if (this.initialized || !this._processRepository) return;
      await this.fetchAll();
      this.initialized = true;
    },
    /**
     * 処理名: 全件取得
     *
     * 処理概要: 永続化レイヤーからプロセス一覧を取得し状態を更新する
     *
     * 実装理由: UI の一覧表示にデータを提供するため
     */
    async fetchAll() {
      if (!this._processRepository) return;
      this.loading = true;
      try {
        this.processes = await this._processRepository.getAll();
      } finally {
        this.loading = false;
      }
    },
    /**
     * 処理名: 追加
     *
     * 処理概要: 部分的なプロセス情報を受け取り、新しいプロセスを作成して保存する
     *
     * 実装理由: 新規プロセス作成機能を提供するため
      * @param partial 新規作成に用いる `ProcessType` の部分情報
    * @returns 生成したプロセスID
     */
    async add(partial: Omit<ProcessType, 'ID' | 'CreateTimestamp' | 'LastUpdatedBy'>) {
      const now = new Date();
      const newItem: ProcessType = {
        ID: generateUUID(),
        CreateTimestamp: now,
        LastUpdatedBy: 'User',
        ...partial
      };
      await this._processRepository.save(newItem);
      await this.fetchAll();
      return { processId: newItem.ID };
    },
    /**
     * 処理名: 更新
     *
     * 処理概要: 与えられたプロセスを保存して一覧を更新する
     *
     * 実装理由: 編集操作の永続化のため
      * @param item 更新対象の `ProcessType` オブジェクト
     */
    async update(item: ProcessType) {
      const updated = {
        ...item,
        LastUpdatedBy: 'User'
      }
      await this._processRepository.save(updated);
      await this.fetchAll();
    },
    /**
     * 処理名: 削除
     *
     * 処理概要: 指定 ID のプロセスを削除し一覧を更新する
     *
     * 実装理由: プロセス削除操作を提供するため
      * @param id 削除対象のプロセス ID
     */
    async remove(id: string) {
      await this._processRepository.delete(id);
      await this.fetchAll();
    }
  }
});
