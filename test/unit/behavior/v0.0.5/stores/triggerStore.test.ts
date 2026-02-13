// @ts-nocheck
import { jest } from '@jest/globals';
import { setActivePinia, createPinia } from 'pinia';
let useTriggerStore: any;
let mockVfs: any;

beforeAll(async () => {
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
  const store = useTriggerStore();
  store.initFromVirtualFS(mockVfs);
});

describe('triggerStore (v0.0.5) - CausalRelations ProcessTypeID based', () => {
  it('fetchAll loads triggers and relations (relations use ProcessTypeID)', async () => {
    const store = useTriggerStore();
    jest.spyOn(store._actionTriggerRepository, 'getAll').mockResolvedValueOnce([
      { ID: 't1', ActionType: 1, CategoryID: 'c', ProcessTypeID: 'p1', Name: 'T', Description: '', Rollgroup: '', Timing: '', TimingDetail: '', CreateTimestamp: '', LastUpdatedBy: '' }
    ]);
    jest.spyOn(store._causalRelationRepository, 'getAll').mockResolvedValueOnce([
      { ID: 'r1', ProcessTypeID: 'p1', ArtifactTypeID: 'a', CrudType: 'C', CreateTimestamp: '', LastUpdatedBy: '' }
    ]);

    await store.fetchAll();
    expect(store.triggers.length).toBe(1);
    expect(store.relations.length).toBe(1);
    expect(store.relations[0].ProcessTypeID).toBe('p1');
  });

  it('addTrigger creates relations with ProcessTypeID equal to trigger.ProcessTypeID', async () => {
    const store = useTriggerStore();
    const saveTriggerSpy = jest.spyOn(store._actionTriggerRepository, 'save').mockResolvedValueOnce(undefined);
    const saveRelSpy = jest.spyOn(store._causalRelationRepository, 'save').mockResolvedValue(undefined);
    jest.spyOn(store._actionTriggerRepository, 'getAll').mockResolvedValueOnce([]);
    jest.spyOn(store._causalRelationRepository, 'getAll').mockResolvedValueOnce([]);

    const triggerPartial = { ActionType: 1, CategoryID: 'c', ProcessTypeID: 'pX', Name: 'T', Description: '', Rollgroup: '', Timing: '', TimingDetail: '' };
    await store.addTrigger(triggerPartial,
      [{ ArtifactTypeID: 'a', CrudType: 'C' }]
    );

    expect(saveTriggerSpy).toHaveBeenCalled();
    expect(saveRelSpy).toHaveBeenCalled();
    // ensure exactly one relation was saved for this input
    expect(saveRelSpy.mock.calls.length).toBe(1);

    // assert the saved relation includes ProcessTypeID equal to triggerPartial.ProcessTypeID
    const savedArg = saveRelSpy.mock.calls[0][0];
    expect(savedArg.ProcessTypeID).toBe(triggerPartial.ProcessTypeID);
    expect(savedArg.ArtifactTypeID).toBe('a');
  });

  it('getRelationsByTriggerId filters relations by trigger.ProcessTypeID', () => {
    const store = useTriggerStore();
    // prepare triggers and relations
    store.triggers = [ { ID: 't1', ProcessTypeID: 'p1' }, { ID: 't2', ProcessTypeID: 'p2' } ];
    store.relations = [
      { ID: 'r1', ProcessTypeID: 'p1', ArtifactTypeID: 'a1', CrudType: 'Input', CreateTimestamp: '', LastUpdatedBy: '' },
      { ID: 'r2', ProcessTypeID: 'p2', ArtifactTypeID: 'a2', CrudType: 'Create', CreateTimestamp: '', LastUpdatedBy: '' }
    ];

    const res1 = store.getRelationsByTriggerId('t1');
    expect(res1.length).toBe(1);
    expect(res1[0].ID).toBe('r1');

    const res2 = store.getRelationsByTriggerId('t2');
    expect(res2.length).toBe(1);
    expect(res2[0].ID).toBe('r2');
  });

  // NOTE: behavior below assumes process-scoped relations are shared and
  // should NOT be deleted when a single trigger is removed. This is a
  // business-rule decision; update test if PO decides otherwise.
  it('removeTrigger does not delete process-scoped relations by default', async () => {
    const store = useTriggerStore();
    // relations belong to process p1
    store.relations = [ { ID: 'r1', ProcessTypeID: 'p1', ArtifactTypeID: 'a', CrudType: 'C', CreateTimestamp: '', LastUpdatedBy: '' } ];
    // spy on delete calls
    const deleteRelSpy = jest.spyOn(store._causalRelationRepository, 'delete').mockResolvedValueOnce(undefined);
    const deleteTrigSpy = jest.spyOn(store._actionTriggerRepository, 'delete').mockResolvedValueOnce(undefined);

    // remove trigger t1 which references process p1
    await store.removeTrigger('t1');

    // Under new design, deleting a trigger should not delete process-scoped relations.
    expect(deleteTrigSpy).toHaveBeenCalledWith('t1');
    expect(deleteRelSpy).not.toHaveBeenCalled();
  });

  it('loadDraft maps relations with ProcessTypeID to input/output artifacts', () => {
    const store = useTriggerStore();
    const inRef = store.draft.inputArtifacts;
    const outRef = store.draft.outputArtifacts;

    const trigger = { ID: 't1', ProcessTypeID: 'p1', Name: 'T', ActionType: 1, CategoryID: 'c', Description: '', Rollgroup: '', Timing: '', TimingDetail: '' };
    const relations = [
      { ID: 'r-in-1', ProcessTypeID: 'p1', ArtifactTypeID: 'a1', CrudType: 'Input', CreateTimestamp: '', LastUpdatedBy: '' },
      { ID: 'r-out-1', ProcessTypeID: 'p1', ArtifactTypeID: 'a2', CrudType: 'Create', CreateTimestamp: '', LastUpdatedBy: '' },
      { ID: 'r-out-2', ProcessTypeID: 'p1', ArtifactTypeID: 'a3', CrudType: 'Update', CreateTimestamp: '', LastUpdatedBy: '' }
    ];

    store.loadDraft(trigger, relations as any[]);

    expect(store.draft.inputArtifacts).toBe(inRef);
    expect(store.draft.outputArtifacts).toBe(outRef);
    expect(store.draft.inputArtifacts.length).toBe(1);
    expect(store.draft.inputArtifacts[0].id).toBe('a1');
    expect(store.draft.outputArtifacts.map((o: any) => o.id)).toEqual(['a2', 'a3']);
  });
});
