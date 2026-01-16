// @ts-nocheck
import { jest } from '@jest/globals';
import { setActivePinia, createPinia } from 'pinia';
let useProcessStore: any;
let ProcessRepository: any;

beforeAll(async () => {
  const repoMod = await import('../../../src/repositories');
  ProcessRepository = repoMod.ProcessRepository;
  ProcessRepository.getAll = jest.fn().mockResolvedValue([]);
  ProcessRepository.save = jest.fn().mockResolvedValue(undefined);
  ProcessRepository.delete = jest.fn().mockResolvedValue(undefined);
  const storeMod = await import('../../../src/stores/processStore');
  useProcessStore = storeMod.useProcessStore;
});

beforeEach(() => {
  setActivePinia(createPinia());
  jest.clearAllMocks();
});

describe('processStore actions', () => {
  it('fetchAll loads processes', async () => {
    ProcessRepository.getAll.mockResolvedValueOnce([
      { ID: 'p1', CategoryID: 'c', Name: 'P', Description: '', CreateTimestamp: '', LastUpdatedBy: '' }
    ]);
    const store = useProcessStore();
    await store.fetchAll();
    expect(store.processes.length).toBe(1);
  });

  it('add calls save and refreshes list', async () => {
    ProcessRepository.save.mockResolvedValueOnce(undefined);
    ProcessRepository.getAll.mockResolvedValueOnce([
      { ID: 'pnew', CategoryID: 'c', Name: 'New', Description: '', CreateTimestamp: '', LastUpdatedBy: '' }
    ]);
    const store = useProcessStore();
    await store.add({ CategoryID: 'c', Name: 'New', Description: '' });
    expect(ProcessRepository.save).toHaveBeenCalled();
    expect(store.processes[0].ID).toBe('pnew');
  });

  it('remove calls delete', async () => {
    ProcessRepository.delete.mockResolvedValueOnce(undefined);
    ProcessRepository.getAll.mockResolvedValueOnce([]);
    const store = useProcessStore();
    await store.remove('p1');
    expect(ProcessRepository.delete).toHaveBeenCalledWith('p1');
  });

  it('update calls save and refreshes', async () => {
    const existing = { ID: 'p1', CategoryID: 'c', Name: 'P', Description: '', CreateTimestamp: '', LastUpdatedBy: '' };
    ProcessRepository.save.mockResolvedValueOnce(undefined);
    ProcessRepository.getAll.mockResolvedValueOnce([existing]);
    const store = useProcessStore();
    await store.update(existing);
    expect(ProcessRepository.save).toHaveBeenCalled();
    expect(store.processes[0].ID).toBe('p1');
  });
});
