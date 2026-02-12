import { VirtualFsRepository } from './base/virtualFsRepository';
import type { VirtualFsInstance } from '../types/models';
import type { 
  CategoryMaster, 
  ActionTriggerType, 
  ArtifactType, 
  CausalRelationType, 
  ProcessType 
} from '../types/models';

/**
 * 処理名: リポジトリファクトリ関数
 *
 * 処理概要: VirtualFsInstance を受けてエンティティ別リポジトリインスタンスを生成する
 *
 * 実装理由: プロジェクト単位で VirtualFS インスタンスを分離し、YAML CRUD を統一する
 * 
 * @param vfs VirtualFsInstance（プロジェクト単位で初期化済み）
 * @returns リポジトリオブジェクト
 */
export function createRepositories(vfs: VirtualFsInstance) {
  return {
    categoryRepository: new VirtualFsRepository<CategoryMaster>('CategoryMaster', vfs),
    actionTriggerRepository: new VirtualFsRepository<ActionTriggerType>('ActionTriggerTypes', vfs),
    artifactRepository: new VirtualFsRepository<ArtifactType>('ArtifactTypes', vfs),
    causalRelationRepository: new VirtualFsRepository<CausalRelationType>('CausalRelationsTypes', vfs),
    processRepository: new VirtualFsRepository<ProcessType>('ProcessTypes', vfs)
  };
}
