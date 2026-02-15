import { defineStore } from 'pinia';
import { createRepositories } from '../repositories';
import type { ActionTriggerType } from '../types/models';
import type { VirtualFsInstance } from '../types/models';
import { generateUUID } from '../lib/uuid';

/**
 * 処理名: トリガーストア
 *
 * 処理概要: アクショントリガーの管理を行う Pinia ストア
 *
 * 実装理由: トリガーの作成/更新/削除と永続化を一元化するため
 */
/**
 * 処理名: トリガーストアエクスポート
 *
 * 処理概要: トリガーを管理する Pinia ストアをエクスポートする
 *
 * 実装理由: トリガー関連の状態管理と永続化操作を一元化するため
 */
export const useTriggerStore = defineStore('data-mgmt-system/trigger', {
  /**
   * ストア状態の初期値
   * @returns 初期 state オブジェクト
   */
  state: () => ({
    _actionTriggerRepository: null as any,
    triggers: [] as ActionTriggerType[],
    loading: false,
    initialized: false
    ,
      draft: {
      ID: '',
      Name: '',
      Description: '',
      CategoryID: '',
      ProcessTypeID: '',
      Rollgroup: '',
      Timing: '',
      TimingDetail: '',
      ActionType: 0,
      inputArtifacts: [] as { id: string; name: string }[],
      outputArtifacts: [] as { id: string; name: string; crud?: string }[]
    } as any
  }),
  getters: {},
  actions: {
    /**
     * 処理名: VirtualFS から初期化
     *
     * 処理概要: VirtualFS インスタンスを受け取り、トリガーリポジトリを初期化する
     *
     * 実装理由: プロジェクト単位で VirtualFS インスタンスを分離管理するため
     * @param vfs VirtualFS インスタンス
     */
    initFromVirtualFS(vfs: VirtualFsInstance) {
      const repos = createRepositories(vfs);
      this._actionTriggerRepository = repos.actionTriggerRepository;
    },
    /**
     * 処理名: 初期化
     *
     * 処理概要: トリガーと関連を読み込んでストアを初期化する
     *
     * 実装理由: 初回ロード時のセットアップを行うため
     */
    async init() {
      if (this.initialized || !this._actionTriggerRepository) return;
      await this.fetchAll();
      this.initialized = true;
    },

    /**
     * 処理名: 全件取得
     *
     * 処理概要: トリガーを取得して状態を更新する
     *
     * 実装理由: UI へのデータ供給と整合性確保のため
     */
    async fetchAll() {
      if (!this._actionTriggerRepository) return;
      this.loading = true;
      try {
        this.triggers = await this._actionTriggerRepository.getAll();
      } finally {
        this.loading = false;
      }
    },

    /**
     * 処理名: トリガードラフトをマージして設定
     * @param partial ドラフトへマージする部分情報
     */
    setDraft(partial: Partial<ActionTriggerType> & { ID?: string }) {
      Object.assign(this.draft, partial);
    },
    /**
     * 処理名: ドラフトを初期化する
     */
    resetDraft() {
      Object.assign(this.draft, { ID: '', Name: '', Description: '', CategoryID: '', ProcessTypeID: '', Rollgroup: '', Timing: '', TimingDetail: '', ActionType: 0 });
      // clear arrays in-place
      this.draft.inputArtifacts.splice(0, this.draft.inputArtifacts.length);
      this.draft.outputArtifacts.splice(0, this.draft.outputArtifacts.length);
    },

    /**
     * 処理名: トリガー追加
     * @param triggerPartial トリガー本体の部分情報
     *
     * 処理概要: トリガー本体を作成して永続化する
     *
     * 実装理由: ActionTriggerType の保存責務を分離するため
    * @returns 保存したトリガーIDと対象プロセスID
     */
    async addTrigger(
      triggerPartial: Omit<ActionTriggerType, 'ID' | 'CreateTimestamp' | 'LastUpdatedBy'>
    ) {
      const now = new Date();
      const triggerId = generateUUID();

      const newTrigger: ActionTriggerType = {
        ID: triggerId,
        CreateTimestamp: now,
        LastUpdatedBy: 'User',
        ...triggerPartial
      };

      await this._actionTriggerRepository.save(newTrigger);

      await this.fetchAll();

      return {
        triggerId,
        processTypeId: triggerPartial.ProcessTypeID
      };
    },

    // 単純削除
    /**
     * 処理名: トリガー削除
     * @param id 削除対象のトリガーID
     *
     * 処理概要: 指定トリガーを削除する
     *
     * 実装理由: トリガー削除時にデータ整合性を保つため
     */
    async removeTrigger(id: string) {
      await this._actionTriggerRepository.delete(id);
      await this.fetchAll();
    }
  }
});
