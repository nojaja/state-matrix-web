// @ts-nocheck
import { jest } from '@jest/globals';
import { setActivePinia, createPinia } from 'pinia';
let useTriggerStore: any;
let ActionTriggerRepository: any;
let CausalRelationRepository: any;

beforeAll(async () => {
  const repoMod = await import('../../../src/repositories');
  ActionTriggerRepository = repoMod.ActionTriggerRepository;
  CausalRelationRepository = repoMod.CausalRelationRepository;
  ActionTriggerRepository.getAll = jest.fn().mockResolvedValue([]);
  ActionTriggerRepository.save = jest.fn().mockResolvedValue(undefined);
  ActionTriggerRepository.delete = jest.fn().mockResolvedValue(undefined);
  CausalRelationRepository.getAll = jest.fn().mockResolvedValue([]);
  CausalRelationRepository.save = jest.fn().mockResolvedValue(undefined);
  CausalRelationRepository.delete = jest.fn().mockResolvedValue(undefined);
  const storeMod = await import('../../../src/stores/triggerStore');
  useTriggerStore = storeMod.useTriggerStore;
});

beforeEach(() => {
  setActivePinia(createPinia());
  jest.clearAllMocks();
});

describe('triggerStore actions', () => {
  it('fetchAll loads triggers and relations', async () => {
    ActionTriggerRepository.getAll.mockResolvedValueOnce([
      { ID: 't1', ActionType: 1, CategoryID: 'c', ProcessTypeID: 'p', Name: 'T', Description: '', Rollgroup: '', Timing: '', TimingDetail: '', CreateTimestamp: '', LastUpdatedBy: '' }
    ]);
    CausalRelationRepository.getAll.mockResolvedValueOnce([
      { ID: 'r1', ActionTriggerTypeID: 't1', ArtifactTypeID: 'a', CrudType: 'C', CreateTimestamp: '', LastUpdatedBy: '' }
    ]);
    const store = useTriggerStore();
    await store.fetchAll();
    expect(store.triggers.length).toBe(1);
    expect(store.relations.length).toBe(1);
  });

  it('addTrigger saves trigger and relations', async () => {
    ActionTriggerRepository.save.mockResolvedValueOnce(undefined);
    CausalRelationRepository.save.mockResolvedValue(undefined);
    ActionTriggerRepository.getAll.mockResolvedValueOnce([]);
    CausalRelationRepository.getAll.mockResolvedValueOnce([]);
    const store = useTriggerStore();
    await store.addTrigger({ ActionType: 1, CategoryID: 'c', ProcessTypeID: 'p', Name: 'T', Description: '', Rollgroup: '', Timing: '', TimingDetail: '' },
      [{ ArtifactTypeID: 'a', CrudType: 'C' }]
    );
    expect(ActionTriggerRepository.save).toHaveBeenCalled();
    expect(CausalRelationRepository.save).toHaveBeenCalled();
  });

  it('removeTrigger deletes trigger and its relations', async () => {
    CausalRelationRepository.delete.mockResolvedValueOnce(undefined);
    ActionTriggerRepository.delete.mockResolvedValueOnce(undefined);
    // prepare store state with relations
    const store = useTriggerStore();
    store.relations = [{ ID: 'r1', ActionTriggerTypeID: 't1', ArtifactTypeID: 'a', CrudType: 'C', CreateTimestamp: '', LastUpdatedBy: '' }];
    await store.removeTrigger('t1');
    expect(CausalRelationRepository.delete).toHaveBeenCalled();
    expect(ActionTriggerRepository.delete).toHaveBeenCalledWith('t1');
  });

  it('updateTrigger updates trigger, deletes and saves relations', async () => {
    ActionTriggerRepository.save.mockResolvedValueOnce(undefined);
    CausalRelationRepository.delete.mockResolvedValueOnce(undefined);
    CausalRelationRepository.save.mockResolvedValueOnce(undefined);
    const store = useTriggerStore();
    const trigger = { ID: 't1', ActionType: 1, CategoryID: 'c', ProcessTypeID: 'p', Name: 'T', Description: '', Rollgroup: '', Timing: '', TimingDetail: '', CreateTimestamp: '', LastUpdatedBy: '' };
    const relations = [{ ID: 'r1', ActionTriggerTypeID: 't1', ArtifactTypeID: 'a', CrudType: 'C', CreateTimestamp: '', LastUpdatedBy: '' }];
    await store.updateTrigger(trigger, relations, ['r2']);
    expect(ActionTriggerRepository.save).toHaveBeenCalled();
    expect(CausalRelationRepository.delete).toHaveBeenCalled();
    expect(CausalRelationRepository.save).toHaveBeenCalled();
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
