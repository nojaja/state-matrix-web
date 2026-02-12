// @ts-nocheck
import { jest } from '@jest/globals';
import { setActivePinia, createPinia } from 'pinia';
let useProcessStore: any;
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
  
  const storeMod = await import('../../../src/stores/processStore');
  useProcessStore = storeMod.useProcessStore;
});

beforeEach(() => {
  setActivePinia(createPinia());
  jest.clearAllMocks();
  
  // Storeを初期化してRepositoryを設定
  const store = useProcessStore();
  store.initFromVirtualFS(mockVfs);
});

describe('processStore actions', () => {
  it('fetchAll loads processes', async () => {
    const store = useProcessStore();
    jest.spyOn(store._processRepository, 'getAll').mockResolvedValueOnce([
      { ID: 'p1', CategoryID: 'c', Name: 'P', Description: '', CreateTimestamp: '', LastUpdatedBy: '' }
    ]);
    await store.fetchAll();
    expect(store.processes.length).toBe(1);
  });

  it('add calls save and refreshes list', async () => {
    const store = useProcessStore();
    jest.spyOn(store._processRepository, 'save').mockResolvedValueOnce(undefined);
    jest.spyOn(store._processRepository, 'getAll').mockResolvedValueOnce([
      { ID: 'pnew', CategoryID: 'c', Name: 'New', Description: '', CreateTimestamp: '', LastUpdatedBy: '' }
    ]);
    await store.add({ CategoryID: 'c', Name: 'New', Description: '' });
    expect(store._processRepository.save).toHaveBeenCalled();
    expect(store.processes[0].ID).toBe('pnew');
  });

  it('remove calls delete', async () => {
    const store = useProcessStore();
    jest.spyOn(store._processRepository, 'delete').mockResolvedValueOnce(undefined);
    jest.spyOn(store._processRepository, 'getAll').mockResolvedValueOnce([]);
    await store.remove('p1');
    expect(store._processRepository.delete).toHaveBeenCalledWith('p1');
  });

  it('update calls save and refreshes', async () => {
    const existing = { ID: 'p1', CategoryID: 'c', Name: 'P', Description: '', CreateTimestamp: '', LastUpdatedBy: '' };
    const store = useProcessStore();
    jest.spyOn(store._processRepository, 'save').mockResolvedValueOnce(undefined);
    jest.spyOn(store._processRepository, 'getAll').mockResolvedValueOnce([existing]);
    await store.update(existing);
    expect(store._processRepository.save).toHaveBeenCalled();
    expect(store.processes[0].ID).toBe('p1');
  });
});
