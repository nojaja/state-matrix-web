import { defineStore } from 'pinia';
import { createRepositories } from '../repositories';
import type { CausalRelationType, VirtualFsInstance } from '../types/models';
import { generateUUID } from '../lib/uuid';

type CausalRelationDraft = Omit<CausalRelationType, 'ID' | 'CreateTimestamp' | 'LastUpdatedBy'>;

type SyncPlan = {
  keepMap: Map<string, CausalRelationType>;
  deleteTargets: CausalRelationType[];
};

/**
 * 処理名: 期待因果関係マップ構築
 * @param processTypeId プロセスID
 * @param desiredRelations 期待する因果関係
 * @param toRelationKey キー生成関数
 * @param normalizeCrudType CRUD種別正規化関数
 * @returns 期待因果関係マップ
 */
function buildDesiredRelationMap(
  processTypeId: string,
  desiredRelations: CausalRelationDraft[],
  toRelationKey: any,
  normalizeCrudType: any
): Map<string, CausalRelationDraft> {
  const desiredMap = new Map<string, CausalRelationDraft>();

  for (const relation of desiredRelations) {
    const normalizedCrudType = normalizeCrudType(relation.CrudType);
    const key = toRelationKey(relation.ArtifactTypeID, normalizedCrudType);
    if (!desiredMap.has(key)) {
      desiredMap.set(key, {
        ProcessTypeID: processTypeId,
        ArtifactTypeID: relation.ArtifactTypeID,
        CrudType: normalizedCrudType
      });
    }
  }

  return desiredMap;
}

/**
 * 処理名: 現在因果関係の同期計画作成
 * @param current 現在の因果関係
 * @param desiredMap 期待因果関係マップ
 * @param toRelationKey キー生成関数
 * @returns 保持・削除対象
 */
function buildSyncPlan(
  current: CausalRelationType[],
  desiredMap: Map<string, CausalRelationDraft>,
  toRelationKey: any
): SyncPlan {
  const keepMap = new Map<string, CausalRelationType>();
  const deleteTargets: CausalRelationType[] = [];

  for (const relation of current) {
    const key = toRelationKey(relation.ArtifactTypeID, relation.CrudType);
    if (!desiredMap.has(key)) {
      deleteTargets.push(relation);
      continue;
    }
    if (!keepMap.has(key)) {
      keepMap.set(key, relation);
      continue;
    }
    deleteTargets.push(relation);
  }

  return {
    keepMap,
    deleteTargets
  };
}

/**
 * 処理名: 保存対象作成
 * @param processTypeId プロセスID
 * @param desiredMap 期待因果関係マップ
 * @param keepMap 保持対象マップ
 * @param normalizeCrudType CRUD種別正規化関数
 * @returns 保存対象の因果関係配列
 */
function buildSaveTargets(
  processTypeId: string,
  desiredMap: Map<string, CausalRelationDraft>,
  keepMap: Map<string, CausalRelationType>,
  normalizeCrudType: any
): CausalRelationType[] {
  const saveTargets: CausalRelationType[] = [];
  const now = new Date();

  for (const [key, desired] of desiredMap.entries()) {
    const kept = keepMap.get(key);
    if (kept) {
      const normalizedCurrentCrudType = normalizeCrudType(kept.CrudType);
      if (kept.CrudType !== normalizedCurrentCrudType) {
        saveTargets.push({
          ...kept,
          CrudType: normalizedCurrentCrudType,
          LastUpdatedBy: 'User'
        });
      }
      continue;
    }

    saveTargets.push({
      ID: generateUUID(),
      ProcessTypeID: processTypeId,
      ArtifactTypeID: desired.ArtifactTypeID,
      CrudType: desired.CrudType,
      CreateTimestamp: now,
      LastUpdatedBy: 'User'
    });
  }

  return saveTargets;
}

/**
 * 処理名: 因果関係ストア
 *
 * 処理概要: CausalRelationType の取得・追加・更新・削除を管理する Pinia ストア
 */
export const useCausalRelationStore = defineStore('data-mgmt-system/causal-relation', {
  /**
  * 処理名: ストア初期状態
  * @returns 初期 state
   */
  state: () => ({
    _actionTriggerRepository: null as any,
    _causalRelationRepository: null as any,
    triggers: [] as any[],
    relations: [] as CausalRelationType[],
    loading: false,
    initialized: false
  }),
  getters: {
    /**
     * 処理名: トリガーIDから因果関係取得
     *
     * 処理概要: 指定トリガーの ProcessTypeID に一致する因果関係を返す
     * @param state
      * @returns トリガーIDを受け取り因果関係配列を返す関数
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
     * 処理名: CRUD種別正規化
     * @param crudType
     * @returns 正規化されたCRUD種別
     */
    normalizeCrudType(crudType: string) {
      return crudType === 'Output' ? 'Create' : crudType;
    },

    /**
     * 処理名: 因果関係キー生成
     * @param artifactTypeId
     * @param crudType
     * @returns 一意キー
     */
    toRelationKey(artifactTypeId: string, crudType: string) {
      return `${artifactTypeId}::${this.normalizeCrudType(crudType)}`;
    },

    /**
     * 処理名: VirtualFS から初期化
     * @param vfs VirtualFS インスタンス
     */
    initFromVirtualFS(vfs: VirtualFsInstance) {
      const repos = createRepositories(vfs);
      this._actionTriggerRepository = repos.actionTriggerRepository;
      this._causalRelationRepository = repos.causalRelationRepository;
      this.initialized = false;
    },

    /**
     * 処理名: 初期化
     */
    async init() {
      if (this.initialized || !this._causalRelationRepository) return;
      await this.fetchAll();
      this.initialized = true;
    },

    /**
     * 処理名: 全件取得
     */
    async fetchAll() {
      if (!this._causalRelationRepository) return;
      this.loading = true;
      try {
        const [triggers, relations] = await Promise.all([
          this._actionTriggerRepository?.getAll?.() ?? Promise.resolve([]),
          this._causalRelationRepository.getAll()
        ]);
        this.triggers = triggers;
        this.relations = relations;
      } finally {
        this.loading = false;
      }
    },

    /**
     * 処理名: 因果関係を1件追加
     * @param input
     * @returns 追加処理の完了
     */
    async addCausalRelation(
      input: CausalRelationDraft
    ) {
      if (!this._causalRelationRepository) return;
      const now = new Date();
      const relation: CausalRelationType = {
        ID: generateUUID(),
        CreateTimestamp: now,
        LastUpdatedBy: 'User',
        ...input
      };
      await this._causalRelationRepository.save(relation);
      await this.fetchAll();
    },

    /**
     * 処理名: 因果関係を複数追加
     * @param inputs
     * @returns 追加処理の完了
     */
    async addCausalRelations(
      inputs: CausalRelationDraft[]
    ) {
      for (const input of inputs) {
        await this.addCausalRelation(input);
      }
    },

    /**
     * 処理名: プロセス単位の因果関係差分同期
     *
     * 処理概要: 指定プロセスの現在データと比較し、追加・更新・削除の差分のみを保存する
     * @param processTypeId
     * @param desiredRelations
     * @returns 差分同期の完了
     */
    async syncCausalRelationsForProcess(
      processTypeId: string,
      desiredRelations: CausalRelationDraft[]
    ) {
      if (!this._causalRelationRepository || !processTypeId) return;

      if (!this.initialized) {
        await this.init();
      } else {
        await this.fetchAll();
      }

      const current = this.relations.filter((relation) => relation.ProcessTypeID === processTypeId);
      const desiredMap = buildDesiredRelationMap(
        processTypeId,
        desiredRelations,
        this.toRelationKey,
        this.normalizeCrudType
      );
      const { keepMap, deleteTargets } = buildSyncPlan(current, desiredMap, this.toRelationKey);
      const saveTargets = buildSaveTargets(
        processTypeId,
        desiredMap,
        keepMap,
        this.normalizeCrudType
      );

      for (const relation of deleteTargets) {
        await this._causalRelationRepository.delete(relation.ID);
      }
      for (const relation of saveTargets) {
        await this._causalRelationRepository.save(relation);
      }

      if (deleteTargets.length > 0 || saveTargets.length > 0) {
        await this.fetchAll();
      }
    }
  }
});
