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
