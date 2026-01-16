// @ts-nocheck
import { jest } from '@jest/globals';
import { setActivePinia, createPinia } from 'pinia';

let useArtifactStore: any;
let ArtifactRepository: any;

beforeAll(async () => {
  const repoMod = await import('../../../src/repositories');
  ArtifactRepository = repoMod.ArtifactRepository;
  // attach jest mocks to repository methods
  ArtifactRepository.getAll = jest.fn().mockResolvedValue([]);
  ArtifactRepository.save = jest.fn().mockResolvedValue(undefined);
  ArtifactRepository.delete = jest.fn().mockResolvedValue(undefined);
  const storeMod = await import('../../../src/stores/artifactStore');
  useArtifactStore = storeMod.useArtifactStore;
});

beforeEach(() => {
  setActivePinia(createPinia());
  jest.clearAllMocks();
});

describe('artifactStore actions', () => {
  it('fetchAll loads artifacts and toggles loading', async () => {
    ArtifactRepository.getAll.mockResolvedValueOnce([
      { ID: 'a', CategoryID: 'c', Name: 'N', Content: 'C', Note: '', CreateTimestamp: '', LastUpdatedBy: '' }
    ]);
    const store = useArtifactStore();
    const p = store.fetchAll();
    expect(store.loading).toBe(true);
    await p;
    expect(store.loading).toBe(false);
    expect(store.artifacts.length).toBe(1);
  });

  it('add calls save and refreshes list', async () => {
    ArtifactRepository.save.mockResolvedValueOnce(undefined);
    ArtifactRepository.getAll.mockResolvedValueOnce([
      { ID: 'new', CategoryID: 'c', Name: 'New', Content: 'C', Note: '', CreateTimestamp: '', LastUpdatedBy: '' }
    ]);
    const store = useArtifactStore();
    await store.add({ CategoryID: 'c', Name: 'New', Content: 'C', Note: '' });
    expect(ArtifactRepository.save).toHaveBeenCalled();
    expect(store.artifacts[0].ID).toBe('new');
  });

  it('update calls save and refreshes list', async () => {
    const existing = { ID: 'e1', CategoryID: 'c', Name: 'Ex', Content: 'C', Note: '', CreateTimestamp: '', LastUpdatedBy: '' };
    ArtifactRepository.save.mockResolvedValueOnce(undefined);
    ArtifactRepository.getAll.mockResolvedValueOnce([existing]);
    const store = useArtifactStore();
    await store.update(existing);
    expect(ArtifactRepository.save).toHaveBeenCalled();
    expect(store.artifacts[0].ID).toBe('e1');
  });

  it('remove calls delete and refreshes list', async () => {
    ArtifactRepository.delete.mockResolvedValueOnce(undefined);
    ArtifactRepository.getAll.mockResolvedValueOnce([]);
    const store = useArtifactStore();
    await store.remove('id-1');
    expect(ArtifactRepository.delete).toHaveBeenCalledWith('id-1');
  });
});
