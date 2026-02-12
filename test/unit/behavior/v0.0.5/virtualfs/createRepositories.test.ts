import { describe, expect, it, jest } from '@jest/globals';
import { createRepositories } from '../../../../../src/repositories';
import type { VirtualFsInstance } from '../../../../../src/types/models';

describe('createRepositories', () => {
  it('creates all repository instances with VirtualFsInstance', () => {
    // VirtualFsInstance モックの作成
    const mockVfs = {
      readFile: jest.fn<() => Promise<string>>(),
      writeFile: jest.fn<() => Promise<void>>(),
      readdir: jest.fn<() => Promise<string[]>>(),
      unlink: jest.fn<() => Promise<void>>()
    } as unknown as VirtualFsInstance;

    // リポジトリ生成
    const repos = createRepositories(mockVfs);

    // 各リポジトリが生成されたことを確認
    expect(repos).toBeDefined();
    expect(repos.categoryRepository).toBeDefined();
    expect(repos.actionTriggerRepository).toBeDefined();
    expect(repos.artifactRepository).toBeDefined();
    expect(repos.causalRelationRepository).toBeDefined();
    expect(repos.processRepository).toBeDefined();
  });

  it('repositories have expected methods', () => {
    const mockVfs = {
      readFile: jest.fn<() => Promise<string>>(),
      writeFile: jest.fn<() => Promise<void>>(),
      readdir: jest.fn<() => Promise<string[]>>(),
      unlink: jest.fn<() => Promise<void>>()
    } as unknown as VirtualFsInstance;

    const repos = createRepositories(mockVfs);

    // 各リポジトリに CRUD メソッドが存在することを確認
    expect(typeof repos.categoryRepository.getAll).toBe('function');
    expect(typeof repos.categoryRepository.get).toBe('function');
    expect(typeof repos.categoryRepository.save).toBe('function');
    expect(typeof repos.categoryRepository.delete).toBe('function');

    expect(typeof repos.artifactRepository.getAll).toBe('function');
    expect(typeof repos.artifactRepository.get).toBe('function');
    expect(typeof repos.artifactRepository.save).toBe('function');
    expect(typeof repos.artifactRepository.delete).toBe('function');
  });
});
