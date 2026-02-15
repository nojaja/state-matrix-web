// @ts-nocheck
import { beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { createPinia, setActivePinia } from 'pinia';

let useCausalRelationStore: any;
let loadError: unknown = null;

beforeAll(async () => {
  try {
    const mod = await import('../../../../../src/stores/causalRelationStore');
    useCausalRelationStore = mod.useCausalRelationStore;
  } catch (e) {
    loadError = e;
  }
});

beforeEach(() => {
  setActivePinia(createPinia());
  jest.clearAllMocks();
});

describe('causalRelationStore (v0.0.5)', () => {
  it('RED: causalRelationStoreが存在し、addCausalRelationを公開する', () => {
    expect(loadError).toBeNull();
    expect(typeof useCausalRelationStore).toBe('function');

    const store = useCausalRelationStore();
    expect(typeof store.addCausalRelation).toBe('function');
  });

  it('RED: addCausalRelationがCausalRelationTypeを1件保存する', async () => {
    expect(loadError).toBeNull();

    const store = useCausalRelationStore();

    const saveSpy = jest.fn().mockResolvedValue(undefined);
    store._causalRelationRepository = {
      save: saveSpy,
      getAll: jest.fn().mockResolvedValue([])
    };

    await store.addCausalRelation({
      ProcessTypeID: 'proc-1',
      ArtifactTypeID: 'art-1',
      CrudType: 'Input'
    });

    expect(saveSpy).toHaveBeenCalledTimes(1);
    expect(saveSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        ProcessTypeID: 'proc-1',
        ArtifactTypeID: 'art-1',
        CrudType: 'Input'
      })
    );
  });

  it('syncCausalRelationsForProcessは変更分のみ保存し重複を削除する', async () => {
    expect(loadError).toBeNull();

    const store = useCausalRelationStore();
    const saveSpy = jest.fn().mockResolvedValue(undefined);
    const deleteSpy = jest.fn().mockResolvedValue(undefined);

    store._causalRelationRepository = {
      save: saveSpy,
      delete: deleteSpy,
      getAll: jest.fn()
        .mockResolvedValueOnce([
          { ID: 'r1', ProcessTypeID: 'proc-1', ArtifactTypeID: 'a1', CrudType: 'Input', CreateTimestamp: new Date(), LastUpdatedBy: 'User' },
          { ID: 'r2', ProcessTypeID: 'proc-1', ArtifactTypeID: 'a1', CrudType: 'Input', CreateTimestamp: new Date(), LastUpdatedBy: 'User' },
          { ID: 'r3', ProcessTypeID: 'proc-1', ArtifactTypeID: 'a2', CrudType: 'Create', CreateTimestamp: new Date(), LastUpdatedBy: 'User' }
        ])
        .mockResolvedValueOnce([
          { ID: 'r1', ProcessTypeID: 'proc-1', ArtifactTypeID: 'a1', CrudType: 'Input', CreateTimestamp: new Date(), LastUpdatedBy: 'User' },
          { ID: 'r4', ProcessTypeID: 'proc-1', ArtifactTypeID: 'a3', CrudType: 'Update', CreateTimestamp: new Date(), LastUpdatedBy: 'User' }
        ])
    };
    store._actionTriggerRepository = {
      getAll: jest.fn().mockResolvedValue([])
    };

    await store.syncCausalRelationsForProcess('proc-1', [
      { ProcessTypeID: 'proc-1', ArtifactTypeID: 'a1', CrudType: 'Input' },
      { ProcessTypeID: 'proc-1', ArtifactTypeID: 'a3', CrudType: 'Update' }
    ]);

    expect(deleteSpy).toHaveBeenCalledTimes(2);
    expect(deleteSpy).toHaveBeenCalledWith('r2');
    expect(deleteSpy).toHaveBeenCalledWith('r3');
    expect(saveSpy).toHaveBeenCalledTimes(1);
    expect(saveSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        ProcessTypeID: 'proc-1',
        ArtifactTypeID: 'a3',
        CrudType: 'Update'
      })
    );
  });
});
