import { jest } from '@jest/globals';
import { setActivePinia, createPinia } from 'pinia';

let useTriggerStore: any;
let ActionTriggerRepository: any;
let CausalRelationRepository: any;

beforeAll(async () => {
  const repoMod = await import('../../../src/repositories');
  ActionTriggerRepository = repoMod.ActionTriggerRepository;
  CausalRelationRepository = repoMod.CausalRelationRepository;
  const storeMod = await import('../../../src/stores/triggerStore');
  useTriggerStore = storeMod.useTriggerStore;
});

beforeEach(() => {
  setActivePinia(createPinia());
  jest.clearAllMocks();
});

/**
 * Triggers store: basic flows (fetchAll, draft operations, add/update/remove)
 */
it('trigger store basic flows', async () => {
  const store = useTriggerStore();

  // mock getAll
  jest.spyOn(ActionTriggerRepository, 'getAll').mockResolvedValue([]);
  jest.spyOn(CausalRelationRepository, 'getAll').mockResolvedValue([]);

  await store.fetchAll();
  expect(store.loading).toBe(false);

  // setDraft
  store.setDraft({ Name: 'T1', CategoryID: 'c1' });
  expect(store.draft.Name).toBe('T1');

  // loadDraft
  const trigger = { ID: 't1', Name: 'T1', Description: '', CategoryID: 'c1', ProcessTypeID: '', Rollgroup: '', Timing: '', TimingDetail: '', ActionType: 0 };
  const relations = [ { ID: 'r1', ActionTriggerTypeID: 't1', CrudType: 'Input', ArtifactTypeID: 'a1' }, { ID: 'r2', ActionTriggerTypeID: 't1', CrudType: 'Output', ArtifactTypeID: 'a2' } ];
  store.loadDraft(trigger as any, relations as any);
  expect(store.draft.inputArtifacts.length).toBe(1);
  expect(store.draft.outputArtifacts.length).toBe(1);

  // resetDraft
  store.resetDraft();
  expect(store.draft.Name).toBe('');

  // addTrigger: spy save and relation save
  const spySaveTrigger = jest.spyOn(ActionTriggerRepository, 'save').mockResolvedValue(undefined);
  const spySaveRelation = jest.spyOn(CausalRelationRepository, 'save').mockResolvedValue(undefined);
  // ensure fetchAll called after addTrigger
  const spyFetchAll = jest.spyOn(store, 'fetchAll');
  await store.addTrigger({ Name: 'New' } as any, [] as any);
  expect(spySaveTrigger).toHaveBeenCalled();
  expect(spyFetchAll).toHaveBeenCalled();

  // updateTrigger: spy delete/save
  const spyDelete = jest.spyOn(CausalRelationRepository, 'delete').mockResolvedValue(undefined);
  await store.updateTrigger(trigger as any, relations as any, ['rX']);
  expect(spyDelete).toHaveBeenCalled();

  // removeTrigger
  const spyDeleteTrigger = jest.spyOn(ActionTriggerRepository, 'delete').mockResolvedValue(undefined);
  await store.removeTrigger('t1');
  expect(spyDeleteTrigger).toHaveBeenCalled();
});
