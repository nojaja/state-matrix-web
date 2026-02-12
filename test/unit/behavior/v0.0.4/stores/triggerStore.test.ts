// @ts-nocheck
import { jest } from '@jest/globals';
import { setActivePinia, createPinia } from 'pinia';
let useTriggerStore: any;
let mockVfs: any;

beforeAll(async () => {
  // モックVirtualFSインスタンス
  mockVfs = {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    readdir: jest.fn().mockResolvedValue([]),
    unlink: jest.fn(),
    init: jest.fn()
  };
  
  const storeMod = await import('../../../../../src/stores/triggerStore');
  useTriggerStore = storeMod.useTriggerStore;
});

beforeEach(() => {
  setActivePinia(createPinia());
  jest.clearAllMocks();
  
  // Storeを初期化してRepositoryを設定
  const store = useTriggerStore();
  store.initFromVirtualFS(mockVfs);
});

describe('triggerStore actions', () => {
  it('fetchAll loads triggers and relations', async () => {
    const store = useTriggerStore();
    jest.spyOn(store._actionTriggerRepository, 'getAll').mockResolvedValueOnce([
      { ID: 't1', ActionType: 1, CategoryID: 'c', ProcessTypeID: 'p', Name: 'T', Description: '', Rollgroup: '', Timing: '', TimingDetail: '', CreateTimestamp: '', LastUpdatedBy: '' }
    ]);
    jest.spyOn(store._causalRelationRepository, 'getAll').mockResolvedValueOnce([
      { ID: 'r1', ActionTriggerTypeID: 't1', ArtifactTypeID: 'a', CrudType: 'C', CreateTimestamp: '', LastUpdatedBy: '' }
    ]);
    await store.fetchAll();
    expect(store.triggers.length).toBe(1);
    expect(store.relations.length).toBe(1);
  });

  it('addTrigger saves trigger and relations', async () => {
    const store = useTriggerStore();
    jest.spyOn(store._actionTriggerRepository, 'save').mockResolvedValueOnce(undefined);
    jest.spyOn(store._causalRelationRepository, 'save').mockResolvedValue(undefined);
    jest.spyOn(store._actionTriggerRepository, 'getAll').mockResolvedValueOnce([]);
    jest.spyOn(store._causalRelationRepository, 'getAll').mockResolvedValueOnce([]);
    await store.addTrigger({ ActionType: 1, CategoryID: 'c', ProcessTypeID: 'p', Name: 'T', Description: '', Rollgroup: '', Timing: '', TimingDetail: '' },
      [{ ArtifactTypeID: 'a', CrudType: 'C' }]
    );
    expect(store._actionTriggerRepository.save).toHaveBeenCalled();
    expect(store._causalRelationRepository.save).toHaveBeenCalled();
  });

  it('removeTrigger deletes trigger and its relations', async () => {
    const store = useTriggerStore();
    // prepare store state with relations
    store.relations = [{ ID: 'r1', ActionTriggerTypeID: 't1', ArtifactTypeID: 'a', CrudType: 'C', CreateTimestamp: '', LastUpdatedBy: '' }];
    jest.spyOn(store._causalRelationRepository, 'delete').mockResolvedValueOnce(undefined);
    jest.spyOn(store._actionTriggerRepository, 'delete').mockResolvedValueOnce(undefined);
    await store.removeTrigger('t1');
    expect(store._causalRelationRepository.delete).toHaveBeenCalled();
    expect(store._actionTriggerRepository.delete).toHaveBeenCalledWith('t1');
  });

  it('updateTrigger updates trigger, deletes and saves relations', async () => {
    const store = useTriggerStore();
    jest.spyOn(store._actionTriggerRepository, 'save').mockResolvedValueOnce(undefined);
    jest.spyOn(store._causalRelationRepository, 'delete').mockResolvedValueOnce(undefined);
    jest.spyOn(store._causalRelationRepository, 'save').mockResolvedValueOnce(undefined);
    const trigger = { ID: 't1', ActionType: 1, CategoryID: 'c', ProcessTypeID: 'p', Name: 'T', Description: '', Rollgroup: '', Timing: '', TimingDetail: '', CreateTimestamp: '', LastUpdatedBy: '' };
    const relations = [{ ID: 'r1', ActionTriggerTypeID: 't1', ArtifactTypeID: 'a', CrudType: 'C', CreateTimestamp: '', LastUpdatedBy: '' }];
    await store.updateTrigger(trigger, relations, ['r2']);
    expect(store._actionTriggerRepository.save).toHaveBeenCalled();
    expect(store._causalRelationRepository.delete).toHaveBeenCalled();
    expect(store._causalRelationRepository.save).toHaveBeenCalled();
  });

  it('loadDraft preserves draft array references and maps relations to artifacts', () => {
    const store = useTriggerStore();
    // keep original references
    const inRef = store.draft.inputArtifacts;
    const outRef = store.draft.outputArtifacts;

    const trigger = { ID: 't1', ActionType: 1, CategoryID: 'c', ProcessTypeID: 'p', Name: 'T', Description: '', Rollgroup: '', Timing: '', TimingDetail: '', CreateTimestamp: '', LastUpdatedBy: '' };
    const relations = [
      { ID: 'r-in-1', ActionTriggerTypeID: 't1', ArtifactTypeID: 'a1', CrudType: 'Input', CreateTimestamp: '', LastUpdatedBy: '' },
      { ID: 'r-out-1', ActionTriggerTypeID: 't1', ArtifactTypeID: 'a2', CrudType: 'Create', CreateTimestamp: '', LastUpdatedBy: '' },
      { ID: 'r-out-2', ActionTriggerTypeID: 't1', ArtifactTypeID: 'a3', CrudType: 'Update', CreateTimestamp: '', LastUpdatedBy: '' }
    ];

    // call loadDraft
    store.loadDraft(trigger, relations as any[]);

    // references should be preserved (in-place splice used)
    expect(store.draft.inputArtifacts).toBe(inRef);
    expect(store.draft.outputArtifacts).toBe(outRef);

    // content should reflect relations
    expect(store.draft.inputArtifacts.length).toBe(1);
    expect(store.draft.inputArtifacts[0].id).toBe('a1');
    expect(store.draft.outputArtifacts.length).toBe(2);
    expect(store.draft.outputArtifacts.map((o: any) => o.id)).toEqual(['a2', 'a3']);
    // crud mapping: Create/Update preserved
    expect(store.draft.outputArtifacts.map((o: any) => o.crud)).toEqual(['Create', 'Update']);
  });
});
