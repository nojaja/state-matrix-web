import { defineStore } from 'pinia';
import { createRepositories } from '../repositories';
import type { CausalRelationType, VirtualFsInstance } from '../types/models';
import { generateUUID } from '../lib/uuid';

/**
 * 処理名: 因果関係ストア
 *
 * 処理概要: CausalRelationType の取得・追加・更新・削除を管理する Pinia ストア
 */
export const useCausalRelationStore = defineStore('data-mgmt-system/causal-relation', {
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
    normalizeCrudType(crudType: string) {
      return crudType === 'Output' ? 'Create' : crudType;
    },

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
     */
    async addCausalRelation(
      input: Omit<CausalRelationType, 'ID' | 'CreateTimestamp' | 'LastUpdatedBy'>
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
     */
    async addCausalRelations(
      inputs: Omit<CausalRelationType, 'ID' | 'CreateTimestamp' | 'LastUpdatedBy'>[]
    ) {
      for (const input of inputs) {
        await this.addCausalRelation(input);
      }
    },

    /**
     * 処理名: プロセス単位の因果関係差分同期
     *
     * 処理概要: 指定プロセスの現在データと比較し、追加・更新・削除の差分のみを保存する
     */
    async syncCausalRelationsForProcess(
      processTypeId: string,
      desiredRelations: Omit<CausalRelationType, 'ID' | 'CreateTimestamp' | 'LastUpdatedBy'>[]
    ) {
      if (!this._causalRelationRepository || !processTypeId) return;

      if (!this.initialized) {
        await this.init();
      } else {
        await this.fetchAll();
      }

      const current = this.relations.filter((relation) => relation.ProcessTypeID === processTypeId);

      const desiredMap = new Map<string, Omit<CausalRelationType, 'ID' | 'CreateTimestamp' | 'LastUpdatedBy'>>();
      for (const relation of desiredRelations) {
        const normalizedCrudType = this.normalizeCrudType(relation.CrudType);
        const key = this.toRelationKey(relation.ArtifactTypeID, normalizedCrudType);
        if (!desiredMap.has(key)) {
          desiredMap.set(key, {
            ProcessTypeID: processTypeId,
            ArtifactTypeID: relation.ArtifactTypeID,
            CrudType: normalizedCrudType
          });
        }
      }

      const keepMap = new Map<string, CausalRelationType>();
      const deleteTargets: CausalRelationType[] = [];

      for (const relation of current) {
        const key = this.toRelationKey(relation.ArtifactTypeID, relation.CrudType);
        if (!desiredMap.has(key)) {
          deleteTargets.push(relation);
          continue;
        }
        if (!keepMap.has(key)) {
          keepMap.set(key, relation);
        } else {
          deleteTargets.push(relation);
        }
      }

      const saveTargets: CausalRelationType[] = [];
      const now = new Date();
      for (const [key, desired] of desiredMap.entries()) {
        const kept = keepMap.get(key);
        if (kept) {
          const normalizedCurrentCrudType = this.normalizeCrudType(kept.CrudType);
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
