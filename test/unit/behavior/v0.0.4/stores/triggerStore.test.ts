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
  it('fetchAll loads triggers only', async () => {
    const store = useTriggerStore();
    jest.spyOn(store._actionTriggerRepository, 'getAll').mockResolvedValueOnce([
      { ID: 't1', ActionType: 1, CategoryID: 'c', ProcessTypeID: 'p', Name: 'T', Description: '', Rollgroup: '', Timing: '', TimingDetail: '', CreateTimestamp: '', LastUpdatedBy: '' }
    ]);
    await store.fetchAll();
    expect(store.triggers.length).toBe(1);
  });

  it('addTrigger saves trigger only', async () => {
    const store = useTriggerStore();
    jest.spyOn(store._actionTriggerRepository, 'save').mockResolvedValueOnce(undefined);
    jest.spyOn(store._actionTriggerRepository, 'getAll').mockResolvedValueOnce([]);
    await store.addTrigger({ ActionType: 1, CategoryID: 'c', ProcessTypeID: 'p', Name: 'T', Description: '', Rollgroup: '', Timing: '', TimingDetail: '' });
    expect(store._actionTriggerRepository.save).toHaveBeenCalled();
  });

  it('removeTrigger deletes trigger only', async () => {
    const store = useTriggerStore();
    jest.spyOn(store._actionTriggerRepository, 'delete').mockResolvedValueOnce(undefined);
    await store.removeTrigger('t1');
    expect(store._actionTriggerRepository.delete).toHaveBeenCalledWith('t1');
  });

  it('setDraft/resetDraft manage draft fields and arrays', () => {
    const store = useTriggerStore();
    store.setDraft({ ID: 't1', Name: 'T', CategoryID: 'c', ProcessTypeID: 'p' } as any);
    store.draft.inputArtifacts.push({ id: 'a1', name: 'A1' });
    store.draft.outputArtifacts.push({ id: 'a2', name: 'A2', crud: 'Create' });
    expect(store.draft.Name).toBe('T');
    store.resetDraft();
    expect(store.draft.Name).toBe('');
    expect(store.draft.inputArtifacts.length).toBe(0);
    expect(store.draft.outputArtifacts.length).toBe(0);
  });

  it('resetDraft preserves draft array references and clears artifacts', () => {
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
