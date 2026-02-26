export type uuid = string;

export interface CategoryMaster {
  ID: uuid;
  Name: string;
  ParentID: uuid | null;
  Level: number;
  Path: string;
}

export interface ActionTriggerType {
  ID: uuid;
  ActionType: number;
  CategoryID: uuid;
  ProcessTypeID: uuid;
  Name: string;
  Description: string;
  Rollgroup: string;
  Timing: string;
  TimingDetail: string;
  CreateTimestamp: Date;
  LastUpdatedBy: string;
}

export interface ArtifactType {
  ID: uuid;
  CategoryID: uuid;
  Name: string;
  Content: string;
  Note: string;
  CreateTimestamp: Date;
  LastUpdatedBy: string;
}

export interface CausalRelationType {
  ID: uuid;
  ProcessTypeID: uuid;
  ArtifactTypeID: uuid;
  CrudType: string;
  CreateTimestamp: Date;
  LastUpdatedBy: string;
}

export interface ProcessType {
  ID: uuid;
  CategoryID: uuid;
  Name: string;
  Description: string;
  CreateTimestamp: Date;
  LastUpdatedBy: string;
}

export type EntityType = 
  | 'CategoryMaster' 
  | 'ActionTriggerTypes' 
  | 'ArtifactTypes' 
  | 'CausalRelationsTypes' 
  | 'ProcessTypes';

export const ENTITY_TYPES: EntityType[] = [
  'CategoryMaster',
  'ActionTriggerTypes',
  'ArtifactTypes',
  'CausalRelationsTypes',
  'ProcessTypes'
];

export type RepoConfig = {
  provider: 'github' | 'gitlab'
  repositoryUrl: string
  branch: string
  token?: string
  lastSyncedCommitSha?: string | null
}

export interface RepoMetadata {
  headSha: string | null
  lastSyncedCommitSha: string | null
  fetchedAt: string // ISO8601 timestamp
  fileSummary: Array<{ path: string; sha: string }>
}

export interface ConflictTriple {
  id: uuid | null
  path: string
  format: 'json' | 'yaml' | 'text'
  base: string
  local: string
  remote: string
  timestamp: string // ISO8601
  metadata?: Record<string, any>
}

/**
 * VirtualFS インスタンスの型定義
 * browser-git-ops ライブラリが提供する VirtualFS インターフェース
 */
export interface VirtualFsInstance {
  init(): Promise<void>;
  readFile: Function;
  writeFile: Function;
  readdir: Function;
  unlink: Function;
  mkdir?: Function;
  rmdir?: Function;
  stat?: Function;
  // v0.0.8: setAdapter は meta オブジェクト or (type, url, branch?, token?) のオーバーロード
  setAdapter?: Function;
  // v0.0.8: getAdapter は新形式 { type, url?, branch?, token?, opts? } を返す
  getAdapter?(): Promise<{ type: string; url?: string; branch?: string; token?: string; opts?: Record<string, unknown> } | null>;
  getAdapterInstance?(): Promise<any | null>;
  getAdapterMeta?(): { type: string; url?: string; branch?: string; token?: string; opts?: Record<string, unknown> } | null;
  // Conflict API: VirtualFS が管理する競合情報の取得と解決
  getConflicts?(): Promise<ConflictTriple[]>;
  resolveConflict?: Function;
}
