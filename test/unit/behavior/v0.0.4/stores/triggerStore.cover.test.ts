// @ts-nocheck
import { jest } from '@jest/globals';
import { setActivePinia, createPinia } from 'pinia';

let useTriggerStore: any;
let mockVfs: any;

beforeAll(async () => {
  // モックVirtualFSインスタンス
  const mockReaddir = jest.fn().mockResolvedValue([]);
  mockVfs = {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    readdir: mockReaddir,
    unlink: jest.fn(),
    init: jest.fn()
  } as any;
  
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

it('trigger store basic flows', async () => {
  const store = useTriggerStore();

  // mock getAll
  jest.spyOn(store._actionTriggerRepository, 'getAll').mockResolvedValue([]);

  await store.fetchAll();
  expect(store.loading).toBe(false);

  // setDraft
  store.setDraft({ Name: 'T1', CategoryID: 'c1' });
  expect(store.draft.Name).toBe('T1');

  // resetDraft
  store.draft.inputArtifacts.push({ id: 'a1', name: 'A1' });
  store.draft.outputArtifacts.push({ id: 'a2', name: 'A2', crud: 'Create' });
  store.resetDraft();
  expect(store.draft.Name).toBe('');
  expect(store.draft.inputArtifacts.length).toBe(0);
  expect(store.draft.outputArtifacts.length).toBe(0);

  // addTrigger: spy save
  const spySaveTrigger = jest.spyOn(store._actionTriggerRepository, 'save').mockResolvedValue(undefined);
  // ensure fetchAll called after addTrigger
  const spyFetchAll = jest.spyOn(store, 'fetchAll');
  await store.addTrigger({ Name: 'New' } as any);
  expect(spySaveTrigger).toHaveBeenCalled();
  expect(spyFetchAll).toHaveBeenCalled();

  // removeTrigger
  const spyDeleteTrigger = jest.spyOn(store._actionTriggerRepository, 'delete').mockResolvedValue(undefined);
  await store.removeTrigger('t1');
  expect(spyDeleteTrigger).toHaveBeenCalled();
});
