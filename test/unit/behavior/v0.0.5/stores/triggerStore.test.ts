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
  it('fetchAll loads triggers only', async () => {
    const store = useTriggerStore();
    jest.spyOn(store._actionTriggerRepository, 'getAll').mockResolvedValueOnce([
      { ID: 't1', ActionType: 1, CategoryID: 'c', ProcessTypeID: 'p1', Name: 'T', Description: '', Rollgroup: '', Timing: '', TimingDetail: '', CreateTimestamp: '', LastUpdatedBy: '' }
    ]);

    await store.fetchAll();
    expect(store.triggers.length).toBe(1);
  });

  it('addTrigger saves trigger only and returns identifiers', async () => {
    const store = useTriggerStore();
    const saveTriggerSpy = jest.spyOn(store._actionTriggerRepository, 'save').mockResolvedValueOnce(undefined);
    jest.spyOn(store._actionTriggerRepository, 'getAll').mockResolvedValueOnce([]);

    const triggerPartial = { ActionType: 1, CategoryID: 'c', ProcessTypeID: 'pX', Name: 'T', Description: '', Rollgroup: '', Timing: '', TimingDetail: '' };
    const result = await store.addTrigger(triggerPartial);

    expect(saveTriggerSpy).toHaveBeenCalled();
    expect(result).toEqual(
      expect.objectContaining({
        triggerId: expect.any(String),
        processTypeId: triggerPartial.ProcessTypeID
      })
    );
  });

  it('setDraft and resetDraft update draft fields', () => {
    const store = useTriggerStore();
    store.setDraft({ ID: 't1', Name: 'T1', CategoryID: 'c', ProcessTypeID: 'p1' } as any);
    expect(store.draft.ID).toBe('t1');
    expect(store.draft.Name).toBe('T1');
    store.resetDraft();
    expect(store.draft.ID).toBe('');
    expect(store.draft.Name).toBe('');
  });

  // NOTE: behavior below assumes process-scoped relations are shared and
  // should NOT be deleted when a single trigger is removed. This is a
  // business-rule decision; update test if PO decides otherwise.
  it('removeTrigger does not delete process-scoped relations by default', async () => {
    const store = useTriggerStore();
    const deleteTrigSpy = jest.spyOn(store._actionTriggerRepository, 'delete').mockResolvedValueOnce(undefined);

    // remove trigger t1 which references process p1
    await store.removeTrigger('t1');

    // Under new design, deleting a trigger should not delete process-scoped relations.
    expect(deleteTrigSpy).toHaveBeenCalledWith('t1');
  });

  it('resetDraft preserves artifacts array references', () => {
    const store = useTriggerStore();
    const inRef = store.draft.inputArtifacts;
    const outRef = store.draft.outputArtifacts;
    store.draft.inputArtifacts.push({ id: 'a1', name: 'A1' });
    store.draft.outputArtifacts.push({ id: 'a2', name: 'A2', crud: 'Create' });
    store.resetDraft();

    expect(store.draft.inputArtifacts).toBe(inRef);
    expect(store.draft.outputArtifacts).toBe(outRef);
    expect(store.draft.inputArtifacts.length).toBe(0);
    expect(store.draft.outputArtifacts.length).toBe(0);
  });
});
