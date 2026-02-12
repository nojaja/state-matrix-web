import { beforeEach, describe, expect, it, jest } from '@jest/globals';

type VirtualFsInstance = {
  readFile: Function;
  writeFile: Function;
  readdir: Function;
  unlink: Function;
};

let VirtualFsRepository: any;

beforeEach(async () => {
  const mod = await import('../../../../../src/repositories/base/virtualFsRepository');
  VirtualFsRepository = mod.VirtualFsRepository;
});

describe('VirtualFsRepository', () => {
  it('getAll reads all yaml files from entity directory', async () => {
    const mockVfs = {
      readdir: jest.fn<() => Promise<string[]>>().mockResolvedValue(['item1.yaml', 'item2.yaml', 'README.md']),
      readFile: jest
        .fn<() => Promise<string>>()
        .mockResolvedValueOnce("ID: '001'\nName: Item1")
        .mockResolvedValueOnce("ID: '002'\nName: Item2"),
      writeFile: jest.fn<() => Promise<void>>(),
      unlink: jest.fn<() => Promise<void>>()
    } as unknown as VirtualFsInstance;

    const repo = new VirtualFsRepository('items', mockVfs);
    const result = await repo.getAll();

    expect(mockVfs.readdir).toHaveBeenCalledWith('items');
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ ID: '001', Name: 'Item1' });
    expect(result[1]).toEqual({ ID: '002', Name: 'Item2' });
  });

  it('get reads a single file by ID', async () => {
    const mockVfs = {
      readFile: jest.fn<() => Promise<string>>().mockResolvedValue("ID: '001'\nName: Item1"),
      readdir: jest.fn<() => Promise<string[]>>(),
      writeFile: jest.fn<() => Promise<void>>(),
      unlink: jest.fn<() => Promise<void>>()
    } as unknown as VirtualFsInstance;

    const repo = new VirtualFsRepository('items', mockVfs);
    const result = await repo.get('001');

    expect(mockVfs.readFile).toHaveBeenCalledWith('items/001.yaml');
    expect(result).toEqual({ ID: '001', Name: 'Item1' });
  });

  it('get returns null if file not found', async () => {
    const mockVfs = {
      readFile: jest.fn<() => Promise<string>>().mockRejectedValue(new Error('Not found')),
      readdir: jest.fn<() => Promise<string[]>>(),
      writeFile: jest.fn<() => Promise<void>>(),
      unlink: jest.fn<() => Promise<void>>()
    } as unknown as VirtualFsInstance;

    const repo = new VirtualFsRepository('items', mockVfs);
    const result = await repo.get('nonexistent');

    expect(result).toBeNull();
  });

  it('save writes item as yaml file', async () => {
    const mockVfs = {
      readdir: jest.fn<() => Promise<string[]>>(),
      readFile: jest.fn<() => Promise<string>>(),
      writeFile: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
      unlink: jest.fn<() => Promise<void>>()
    } as unknown as VirtualFsInstance;

    const repo = new VirtualFsRepository('items', mockVfs);
    const item = { ID: '001', Name: 'Item1' };

    await repo.save(item);

    expect(mockVfs.writeFile).toHaveBeenCalledWith(
      'items/001.yaml',
      expect.stringContaining('ID: \'001\'')
    );
  });

  it('delete removes yaml file', async () => {
    const mockVfs = {
      readdir: jest.fn<() => Promise<string[]>>(),
      readFile: jest.fn<() => Promise<string>>(),
      writeFile: jest.fn<() => Promise<void>>(),
      unlink: jest.fn<() => Promise<void>>().mockResolvedValue(undefined)
    } as unknown as VirtualFsInstance;

    const repo = new VirtualFsRepository('items', mockVfs);

    await repo.delete('001');

    expect(mockVfs.unlink).toHaveBeenCalledWith('items/001.yaml');
  });

  it('getAll skips files with parse errors and logs', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const mockVfs = {
      readdir: jest.fn<() => Promise<string[]>>().mockResolvedValue(['item1.yaml', 'item2.yaml']),
      readFile: jest
        .fn<() => Promise<string>>()
        .mockResolvedValueOnce("ID: '001'\nName: Item1")
        .mockResolvedValueOnce('invalid: [yaml'),
      writeFile: jest.fn<() => Promise<void>>(),
      unlink: jest.fn<() => Promise<void>>()
    } as unknown as VirtualFsInstance;

    const repo = new VirtualFsRepository('items', mockVfs);
    const result = await repo.getAll();

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ ID: '001', Name: 'Item1' });
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });
});
