import { defineStore } from 'pinia';
import { createRepositories } from '../repositories';
import type { ActionTriggerType, CausalRelationType } from '../types/models';
import type { VirtualFsInstance } from '../types/models';
import { generateUUID } from '../lib/uuid';

/**
 * 処理名: トリガーストア
 *
 * 処理概要: アクショントリガーとそれに紐づく因果関係の管理を行う Pinia ストア
 *
 * 実装理由: トリガーの作成/更新/削除と関連の永続化を一元化するため
 */
/**
 * 処理名: トリガーストアエクスポート
 *
 * 処理概要: トリガーとその因果関係を管理する Pinia ストアをエクスポートする
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
    _causalRelationRepository: null as any,
    triggers: [] as ActionTriggerType[],
    relations: [] as CausalRelationType[],
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
  getters: {
    /**
     * 指定トリガーIDに紐づく関係を取得
     * @param state ストアの state
     * @returns 指定トリガーに紐づく `CausalRelationType[]` を返す関数
     */
    getRelationsByTriggerId(state) {
      return (id: string) => {
        const trigger = state.triggers.find((t: any) => t.ID === id);
        if (!trigger || !trigger.ProcessTypeID) return [];
        return state.relations.filter((r: any) => r.ProcessTypeID === trigger.ProcessTypeID);
      };
    }
  },
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
      this._causalRelationRepository = repos.causalRelationRepository;
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
     * 処理概要: トリガーと関連を並列で取得して状態を更新する
     *
     * 実装理由: UI へのデータ供給と整合性確保のため
     */
    async fetchAll() {
      if (!this._actionTriggerRepository) return;
      this.loading = true;
      try {
        const [t, r] = await Promise.all([
          this._actionTriggerRepository.getAll(),
          this._causalRelationRepository.getAll()
        ]);
        this.triggers = t;
        this.relations = r;
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
     * 処理名: トリガーと関係をドラフトに読み込む
     * @param trigger 読み込むトリガー
     * @param relations トリガーに紐づく関係配列
     */
    loadDraft(trigger: ActionTriggerType, relations: CausalRelationType[]) {
      // assign scalar fields
      Object.assign(this.draft, {
        ID: trigger.ID,
        Name: trigger.Name,
        Description: trigger.Description,
        CategoryID: trigger.CategoryID,
        ProcessTypeID: trigger.ProcessTypeID,
        Rollgroup: trigger.Rollgroup,
        Timing: trigger.Timing,
        TimingDetail: trigger.TimingDetail,
        ActionType: trigger.ActionType
      });
      // update arrays in-place to preserve references
      const inArts = relations.filter(r => r.CrudType === 'Input').map(r => ({ id: r.ArtifactTypeID, name: '' }));
      const outArts = relations
        .filter(r => r.CrudType === 'Output' || r.CrudType === 'Create' || r.CrudType === 'Update')
        .map(r => ({ id: r.ArtifactTypeID, name: '', crud: r.CrudType === 'Output' ? 'Create' : r.CrudType }));
      this.draft.inputArtifacts.splice(0, this.draft.inputArtifacts.length, ...inArts);
      this.draft.outputArtifacts.splice(0, this.draft.outputArtifacts.length, ...outArts);
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
     * @param relationsPartial 付随する因果関係の配列
     *
     * 処理概要: トリガー本体と関連情報を作成して永続化する
     *
     * 実装理由: UI からの一括登録をサポートするため
     */
    async addTrigger(
      triggerPartial: Omit<ActionTriggerType, 'ID' | 'CreateTimestamp' | 'LastUpdatedBy'>,
      relationsPartial: Omit<CausalRelationType, 'ID' | 'ProcessTypeID' | 'CreateTimestamp' | 'LastUpdatedBy'>[]
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

      for (const rel of relationsPartial) {
        const newRel: CausalRelationType = {
          ID: generateUUID(),
          ProcessTypeID: triggerPartial.ProcessTypeID,
          CreateTimestamp: now,
          LastUpdatedBy: 'User',
          ...rel
        };
        await this._causalRelationRepository.save(newRel);
      }

      await this.fetchAll();
    },

    /**
     * 処理名: トリガー更新
     * @param trigger 更新対象のトリガー
     * @param relations 関連の完全セット
     * @param deletedRelationIds 削除する関連のID配列
     *
     * 処理概要: トリガーと関連の更新・削除を処理し永続化する
     *
     * 実装理由: 編集画面からの変更を保存するため
     */
    async updateTrigger(
      trigger: ActionTriggerType,
      relations: CausalRelationType[], // 既存更新および新規追加を含む完全セット
      deletedRelationIds: string[] // 削除された関連ID
    ) {
      // トリガー更新
      await this._actionTriggerRepository.save({
        ...trigger,
        LastUpdatedBy: 'User'
      });

      // 関連削除
      for (const id of deletedRelationIds) {
        await this._causalRelationRepository.delete(id);
      }

      // 関連保存（新規 or 更新）
      for (const rel of relations) {
        await this._causalRelationRepository.save({
          ...rel,
          LastUpdatedBy: 'User'
        });
      }

      await this.fetchAll();
    },

    // 単純削除
    /**
     * 処理名: トリガー削除
     * @param id 削除対象のトリガーID
     *
     * 処理概要: 指定トリガーとそれに紐づく関連を削除する
     *
     * 実装理由: トリガー削除時に関連の整合性を保つため
     */
    async removeTrigger(id: string) {
      // Under new design, relations are scoped to ProcessTypeID and may be
      // shared across triggers. Do not delete relations when removing a single
      // trigger to avoid unintended data loss. Only delete the trigger itself.
      await this._actionTriggerRepository.delete(id);
      await this.fetchAll();
    }
  }
});
