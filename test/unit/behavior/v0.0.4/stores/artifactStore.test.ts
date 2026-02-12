// @ts-nocheck
import { jest } from '@jest/globals';
import { setActivePinia, createPinia } from 'pinia';

let useArtifactStore: any;
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
  
  const storeMod = await import('../../../../../src/stores/artifactStore');
  useArtifactStore = storeMod.useArtifactStore;
});

beforeEach(() => {
  setActivePinia(createPinia());
  jest.clearAllMocks();
  
  // Storeを初期化してRepositoryを設定
  const store = useArtifactStore();
  store.initFromVirtualFS(mockVfs);
});

describe('artifactStore のアクション', () => {
  it('fetchAll はアーティファクトを読み込み、loading を切り替える', async () => {
    const store = useArtifactStore();
    jest.spyOn(store._artifactRepository, 'getAll').mockResolvedValueOnce([
      { ID: 'a', CategoryID: 'c', Name: 'N', Content: 'C', Note: '', CreateTimestamp: '', LastUpdatedBy: '' }
    ]);
    const p = store.fetchAll();
    expect(store.loading).toBe(true);
    await p;
    expect(store.loading).toBe(false);
    expect(store.artifacts.length).toBe(1);
  });

  it('add は save を呼び出し、一覧を更新する', async () => {
    const store = useArtifactStore();
    jest.spyOn(store._artifactRepository, 'save').mockResolvedValueOnce(undefined);
    jest.spyOn(store._artifactRepository, 'getAll').mockResolvedValueOnce([
      { ID: 'new', CategoryID: 'c', Name: 'New', Content: 'C', Note: '', CreateTimestamp: '', LastUpdatedBy: '' }
    ]);
    await store.add({ CategoryID: 'c', Name: 'New', Content: 'C', Note: '' });
    expect(store._artifactRepository.save).toHaveBeenCalled();
    expect(store.artifacts[0].ID).toBe('new');
  });

  it('update は save を呼び出し、一覧を更新する', async () => {
    const existing = { ID: 'e1', CategoryID: 'c', Name: 'Ex', Content: 'C', Note: '', CreateTimestamp: '', LastUpdatedBy: '' };
    const store = useArtifactStore();
    jest.spyOn(store._artifactRepository, 'save').mockResolvedValueOnce(undefined);
    jest.spyOn(store._artifactRepository, 'getAll').mockResolvedValueOnce([existing]);
    await store.update(existing);
    expect(store._artifactRepository.save).toHaveBeenCalled();
    expect(store.artifacts[0].ID).toBe('e1');
  });

  it('remove は delete を呼び出し、一覧を更新する', async () => {
    const store = useArtifactStore();
    jest.spyOn(store._artifactRepository, 'delete').mockResolvedValueOnce(undefined);
    jest.spyOn(store._artifactRepository, 'getAll').mockResolvedValueOnce([]);
    await store.remove('id-1');
    expect(store._artifactRepository.delete).toHaveBeenCalledWith('id-1');
  });
});
