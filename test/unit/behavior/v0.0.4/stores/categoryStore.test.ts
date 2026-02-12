// @ts-nocheck
import { jest } from '@jest/globals';
import { setActivePinia, createPinia } from 'pinia';
import { useCategoryStore } from '../../../../../src/stores/categoryStore';
import type { CategoryMaster } from '../../../../../src/types/models';

beforeEach(() => {
  setActivePinia(createPinia());
});

describe('useCategoryStore getters', () => {
  it('builds tree correctly (getTree)', () => {
    const store = useCategoryStore();
    const data: CategoryMaster[] = [
      { ID: '1', Name: 'Root', ParentID: null, Level: 0, Path: '' },
      { ID: '2', Name: 'ChildA', ParentID: '1', Level: 1, Path: 'Root' },
      { ID: '3', Name: 'ChildB', ParentID: '1', Level: 1, Path: 'Root' },
      { ID: '4', Name: 'Grand', ParentID: '2', Level: 2, Path: 'Root/ChildA' }
    ];
    store.categories = data;

    const tree = store.getTree;
    expect(Array.isArray(tree)).toBe(true);
    expect(tree.length).toBe(1);
    expect(tree[0].ID).toBe('1');
    expect(tree[0].children).toBeDefined();
    expect(tree[0].children!.length).toBe(2);
    const childA = tree[0].children!.find(c => c.ID === '2')!;
    expect(childA.children).toBeDefined();
    expect(childA.children![0].ID).toBe('4');
  });

  it('returns path map correctly (getPathMap)', () => {
    const store = useCategoryStore();
    store.categories = [
      { ID: 'a', Name: 'A', ParentID: null, Level: 0, Path: 'root' }
    ];
    const map = store.getPathMap;
    expect(map).toHaveProperty('a');
    expect(map['a']).toContain('A');
  });

  it('returns id->category map (getMap)', () => {
    const store = useCategoryStore();
    store.categories = [
      { ID: 'x', Name: 'X', ParentID: null, Level: 0, Path: '' }
    ];
    const m = store.getMap;
    expect(m['x']).toBeDefined();
    expect(m['x'].Name).toBe('X');
  });
});

describe('useCategoryStore actions', () => {
  let useCategoryStore: any;
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
    
    const storeMod = await import('../../../../../src/stores/categoryStore');
    useCategoryStore = storeMod.useCategoryStore;
  });

  beforeEach(() => {
    setActivePinia(createPinia());
    jest.clearAllMocks();
    
    // Storeを初期化してRepositoryを設定
    const store = useCategoryStore();
    store.initFromVirtualFS(mockVfs);
  });

  it('fetchAll loads categories', async () => {
    const store = useCategoryStore();
    jest.spyOn(store._categoryRepository, 'getAll').mockResolvedValueOnce([
      { ID: '1', Name: 'Root', ParentID: null, Level: 0, Path: '' }
    ]);
    await store.fetchAll();
    expect(store.categories.length).toBe(1);
  });

  it('add calls save and refreshes', async () => {
    const store = useCategoryStore();
    jest.spyOn(store._categoryRepository, 'save').mockResolvedValueOnce(undefined);
    jest.spyOn(store._categoryRepository, 'getAll').mockResolvedValueOnce([
      { ID: 'new', Name: 'New', ParentID: null, Level: 0, Path: '' }
    ]);
    await store.add({ Name: 'New', ParentID: null, Level: 0, Path: '' });
    expect(store._categoryRepository.save).toHaveBeenCalled();
    expect(store.categories[0].ID).toBe('new');
  });

  it('remove calls delete and refreshes', async () => {
    const store = useCategoryStore();
    jest.spyOn(store._categoryRepository, 'delete').mockResolvedValueOnce(undefined);
    jest.spyOn(store._categoryRepository, 'getAll').mockResolvedValueOnce([]);
    await store.remove('id-1');
    expect(store._categoryRepository.delete).toHaveBeenCalledWith('id-1');
  });
});
