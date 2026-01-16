/* eslint-disable jsdoc/require-jsdoc */
// @ts-nocheck
import { jest } from '@jest/globals';
import { OpfsRepository } from '../../../src/repositories/OpfsRepository';

describe('OpfsRepository', () => {
  let rootDir: any;
  let dir: any;
  beforeEach(() => {
    // mock writable
    const writable = { write: jest.fn().mockResolvedValue(undefined), close: jest.fn().mockResolvedValue(undefined) };

    // mock file handle
    const fileHandle = {
      kind: 'file',
      getFile: jest.fn().mockResolvedValue({ text: async () => 'ID: "1"\nName: "Test"' }),
      createWritable: jest.fn().mockResolvedValue(writable)
    };

    // mock directory with entries async iterator
    dir = {
      entries: async function* () {
        yield ['1.yaml', fileHandle];
      },
      getFileHandle: jest.fn().mockResolvedValue(fileHandle),
      removeEntry: jest.fn().mockResolvedValue(undefined),
      getDirectoryHandle: jest.fn().mockResolvedValue(dir)
    };

    rootDir = {
      getDirectoryHandle: jest.fn().mockResolvedValue(dir)
    };

    // mock navigator.storage.getDirectory
    // @ts-ignore
    global.navigator = global.navigator || {};
    // @ts-ignore
    global.navigator.storage = { getDirectory: jest.fn().mockResolvedValue(rootDir) };

    // stub the internal getDirectoryHandle to return our mock dir directly
    // this avoids relying on navigator behavior in the test environment
    // @ts-ignore
    OpfsRepository.prototype.getDirectoryHandle = jest.fn().mockResolvedValue(dir);
  });

  afterEach(() => {
    jest.resetAllMocks();
    // clean navigator mock
    try {
      // @ts-ignore
      delete (global.navigator as any).storage;
    } catch {}
  });

  it('getAll reads yaml files and returns items', async () => {
    const repo = new OpfsRepository('test');
    const items = await repo.getAll();
    expect(Array.isArray(items)).toBe(true);
    expect(items.length).toBe(1);
    expect(items[0].ID).toBe('1');
  });

  it('get returns item when file exists', async () => {
    const repo = new OpfsRepository('test');
    const item = await repo.get('1');
    expect(item).not.toBeNull();
    expect(item.ID).toBe('1');
  });

  it('save writes yaml content', async () => {
    const repo = new OpfsRepository('test');
    const item = { ID: '2', Name: 'SaveTest' };
    await repo.save(item);
    // ensure getDirectoryHandle and file operations were invoked
    // root.getDirectoryHandle should have been called
    // since getDirectoryHandle is stubbed on the prototype in tests,
    // assert the internal helper was invoked
    // @ts-ignore
    expect(OpfsRepository.prototype.getDirectoryHandle).toHaveBeenCalled();
    expect(dir.getFileHandle).toHaveBeenCalledWith('2.yaml', { create: true });
  });

  it('delete removes the entry', async () => {
    const repo = new OpfsRepository('test');
    await repo.delete('1');
    expect(dir.removeEntry).toHaveBeenCalledWith('1.yaml');
  });
});
