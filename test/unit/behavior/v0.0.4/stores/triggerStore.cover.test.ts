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
  jest.spyOn(store._causalRelationRepository, 'getAll').mockResolvedValue([]);

  await store.fetchAll();
  expect(store.loading).toBe(false);

  // setDraft
  store.setDraft({ Name: 'T1', CategoryID: 'c1' });
  expect(store.draft.Name).toBe('T1');

  // loadDraft
  const trigger = { ID: 't1', Name: 'T1', Description: '', CategoryID: 'c1', ProcessTypeID: '', Rollgroup: '', Timing: '', TimingDetail: '', ActionType: 0 };
  const relations = [ { ID: 'r1', ProcessTypeID: 't1', CrudType: 'Input', ArtifactTypeID: 'a1' }, { ID: 'r2', ProcessTypeID: 't1', CrudType: 'Output', ArtifactTypeID: 'a2' } ];
  store.loadDraft(trigger as any, relations as any);
  expect(store.draft.inputArtifacts.length).toBe(1);
  expect(store.draft.outputArtifacts.length).toBe(1);

  // resetDraft
  store.resetDraft();
  expect(store.draft.Name).toBe('');

  // addTrigger: spy save and relation save
  const spySaveTrigger = jest.spyOn(store._actionTriggerRepository, 'save').mockResolvedValue(undefined);
  jest.spyOn(store._causalRelationRepository, 'save').mockResolvedValue(undefined);
  // ensure fetchAll called after addTrigger
  const spyFetchAll = jest.spyOn(store, 'fetchAll');
  await store.addTrigger({ Name: 'New' } as any, [] as any);
  expect(spySaveTrigger).toHaveBeenCalled();
  expect(spyFetchAll).toHaveBeenCalled();

  // updateTrigger: spy delete/save
  const spyDelete = jest.spyOn(store._causalRelationRepository, 'delete').mockResolvedValue(undefined);
  await store.updateTrigger(trigger as any, relations as any, ['rX']);
  expect(spyDelete).toHaveBeenCalled();

  // removeTrigger
  const spyDeleteTrigger = jest.spyOn(store._actionTriggerRepository, 'delete').mockResolvedValue(undefined);
  await store.removeTrigger('t1');
  expect(spyDeleteTrigger).toHaveBeenCalled();
});
