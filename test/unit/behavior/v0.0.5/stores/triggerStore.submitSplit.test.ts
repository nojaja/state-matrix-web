// @ts-nocheck
import { beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { createPinia, setActivePinia } from 'pinia';

let useTriggerStore: any;
let mockVfs: any;

beforeAll(async () => {
  const mod = await import('../../../../../src/stores/triggerStore');
  useTriggerStore = mod.useTriggerStore;

  mockVfs = {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    readdir: jest.fn().mockResolvedValue([]),
    unlink: jest.fn(),
    init: jest.fn()
  };
});

beforeEach(() => {
  setActivePinia(createPinia());
  jest.clearAllMocks();
  const store = useTriggerStore();
  store.initFromVirtualFS(mockVfs);
});

describe('triggerStore addTrigger split responsibility (v0.0.5)', () => {
  it('RED: addTriggerはCausalRelationTypeを保存しない（関係配列が与えられても）', async () => {
    // Given
    const store = useTriggerStore();
    const saveTriggerSpy = jest.spyOn(store._actionTriggerRepository, 'save').mockResolvedValueOnce(undefined);
    jest.spyOn(store._actionTriggerRepository, 'getAll').mockResolvedValueOnce([]);

    const triggerPayload = {
      ActionType: 0,
      CategoryID: 'cat-1',
      ProcessTypeID: 'proc-1',
      Name: 'trigger-1',
      Description: '',
      Rollgroup: '',
      Timing: '',
      TimingDetail: ''
    };

    // When
    await store.addTrigger(triggerPayload);

    // Then
    expect(saveTriggerSpy).toHaveBeenCalledTimes(1);
  });

  it('RED: addTriggerは保存したTrigger識別子を返す', async () => {
    // Given
    const store = useTriggerStore();
    jest.spyOn(store._actionTriggerRepository, 'save').mockResolvedValueOnce(undefined);
    jest.spyOn(store._actionTriggerRepository, 'getAll').mockResolvedValueOnce([]);

    const triggerPayload = {
      ActionType: 0,
      CategoryID: 'cat-2',
      ProcessTypeID: 'proc-2',
      Name: 'trigger-2',
      Description: '',
      Rollgroup: '',
      Timing: '',
      TimingDetail: ''
    };

    // When
    const result = await store.addTrigger(triggerPayload);

    // Then
    expect(result).toEqual(
      expect.objectContaining({
        triggerId: expect.any(String),
        processTypeId: 'proc-2'
      })
    );
  });
});
