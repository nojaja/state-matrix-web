// @ts-nocheck
import { beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { createPinia, setActivePinia } from 'pinia';

let useCausalRelationStore: any;
let loadError: unknown = null;

beforeAll(async () => {
  try {
    const mod = await import('../../../../../src/stores/causalRelationStore');
    useCausalRelationStore = mod.useCausalRelationStore;
  } catch (error) {
    loadError = error;
  }
});

beforeEach(() => {
  setActivePinia(createPinia());
  jest.clearAllMocks();
});

describe('causalRelationStore.getRelationsByTriggerId (v0.0.5)', () => {
  it('RED: triggerStore.getRelationsByTriggerIdの複製ロジックとして公開される', () => {
    // Given
    expect(loadError).toBeNull();
    const store = useCausalRelationStore();

    // Then
    expect(typeof store.getRelationsByTriggerId).toBe('function');
  });

  it('RED: TriggerIDからトリガーを特定しProcessTypeID一致のrelationsのみ返す', () => {
    // Given
    const store = useCausalRelationStore();

    store.triggers = [
      { ID: 'trigger-1', ProcessTypeID: 'process-a' },
      { ID: 'trigger-2', ProcessTypeID: 'process-b' }
    ];
    store.relations = [
      {
        ID: 'rel-1',
        ProcessTypeID: 'process-a',
        ArtifactTypeID: 'artifact-1',
        CrudType: 'Input',
        CreateTimestamp: new Date(),
        LastUpdatedBy: 'User'
      },
      {
        ID: 'rel-2',
        ProcessTypeID: 'process-b',
        ArtifactTypeID: 'artifact-2',
        CrudType: 'Create',
        CreateTimestamp: new Date(),
        LastUpdatedBy: 'User'
      }
    ];

    // When
    const result = store.getRelationsByTriggerId('trigger-1');

    // Then
    expect(result).toEqual([
      expect.objectContaining({
        ID: 'rel-1',
        ProcessTypeID: 'process-a'
      })
    ]);
  });

  it('RED: 該当Triggerがない場合は空配列を返す', () => {
    // Given
    const store = useCausalRelationStore();
    store.triggers = [];
    store.relations = [
      {
        ID: 'rel-1',
        ProcessTypeID: 'process-a',
        ArtifactTypeID: 'artifact-1',
        CrudType: 'Input',
        CreateTimestamp: new Date(),
        LastUpdatedBy: 'User'
      }
    ];

    // When
    const result = store.getRelationsByTriggerId('trigger-not-found');

    // Then
    expect(result).toEqual([]);
  });
});
