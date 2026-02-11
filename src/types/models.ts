export interface CategoryMaster {
  ID: string;
  Name: string;
  ParentID: string | null;
  Level: number;
  Path: string;
}

export interface ActionTriggerType {
  ID: string;
  ActionType: number;
  CategoryID: string;
  ProcessTypeID: string;
  Name: string;
  Description: string;
  Rollgroup: string;
  Timing: string;
  TimingDetail: string;
  CreateTimestamp: string;
  LastUpdatedBy: string;
}

export interface ArtifactType {
  ID: string;
  CategoryID: string;
  Name: string;
  Content: string;
  Note: string;
  CreateTimestamp: string;
  LastUpdatedBy: string;
}

export interface CausalRelationType {
  ID: string;
  ActionTriggerTypeID: string;
  ArtifactTypeID: string;
  CrudType: string;
  CreateTimestamp: string;
  LastUpdatedBy: string;
}

export interface ProcessType {
  ID: string;
  CategoryID: string;
  Name: string;
  Description: string;
  CreateTimestamp: string;
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
  owner: string
  repository: string
  branch: string
  host?: string
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
  id: string | null
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
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  readdir(path: string): Promise<string[]>;
  unlink(path: string): Promise<void>;
  mkdir?(path: string): Promise<void>;
  rmdir?(path: string): Promise<void>;
  stat?(path: string): Promise<any>;
  getAdapter?(): Promise<{ type: string; opts?: Record<string, unknown> } | null>;
  setAdapter?(input: { type: string; opts?: Record<string, unknown> }): Promise<void>;
  // Conflict API: VirtualFS が管理する競合情報の取得と解決
  getConflicts?(): Promise<ConflictTriple[]>;
  resolveConflict?(path: string, resolution: 'local' | 'remote'): Promise<void>;
}
