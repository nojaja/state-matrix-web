import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { setActivePinia, createPinia } from 'pinia';
import type { VirtualFsInstance } from '../../../../../src/types/models';
import { createRepositories } from '../../../../../src/repositories';

/**
 * 新しい VirtualFS パターンでのストア統合テスト
 * 概要: VirtualFsManager から取得した VirtualFS インスタンスを使用して、
 *        createRepositories でリポジトリを生成し、ストアで CRUD を実行するフロー
 */
describe('artifactStore with VirtualFS (integration)', () => {
  let mockVfs: VirtualFsInstance;
  let repos: ReturnType<typeof createRepositories>;

  beforeEach(async () => {
    // Pinia 初期化
    setActivePinia(createPinia());

    // VirtualFsInstance モック
    mockVfs = {
      readFile: jest.fn<() => Promise<string>>().mockResolvedValue("ID: 'art1'\nName: TestArtifact\nCategoryID: 'cat1'\nContent: 'Sample'\nNote: ''\nCreateTimestamp: '2024-01-01T00:00:00Z'\nLastUpdatedBy: 'user'"),
      writeFile: jest.fn<() => Promise<void>>(),
      readdir: jest.fn<() => Promise<string[]>>().mockResolvedValue(['art1.yaml']),
      unlink: jest.fn<() => Promise<void>>()
    } as unknown as VirtualFsInstance;

    // リポジトリ生成
    repos = createRepositories(mockVfs);

    // ストア動的インポート（副作用のみ）
    await import('../../../../../src/stores/artifactStore');
  });

  it('can initialize and fetch artifacts from VirtualFS', async () => {
    // リポジトリから fetchAll (概念デモ)
    // 実际のストア実装では、init アクション内で repositories.artifactRepository.getAll() を呼ぶ
    const artifacts = await repos.artifactRepository.getAll();

    expect(artifacts).toHaveLength(1);
    expect(artifacts[0].ID).toBe('art1');
    expect(artifacts[0].Name).toBe('TestArtifact');
  });

  it('demonstrates factory pattern for multi-entity repositories', async () => {
    // すべてのリポジトリが同じ VirtualFS インスタンスを共有
    expect(repos.categoryRepository).toBeDefined();
    expect(repos.artifactRepository).toBeDefined();
    expect(repos.processRepository).toBeDefined();

    // readdir が各ディレクトリに対して呼ばれる可能性
    await repos.artifactRepository.getAll();
    await repos.categoryRepository.getAll();

    expect(mockVfs.readdir).toHaveBeenCalled();
  });

  it('projects can maintain isolated VirtualFS instances', async () => {
    // プロジェクト A 用の VirtualFS
    const vfsProjectA = {
      readdir: jest.fn<() => Promise<string[]>>().mockResolvedValue(['artA.yaml']),
      readFile: jest.fn<() => Promise<string>>().mockResolvedValue("ID: 'artA'\nName: ProjectA"),
      writeFile: jest.fn<() => Promise<void>>(),
      unlink: jest.fn<() => Promise<void>>()
    } as unknown as VirtualFsInstance;

    // プロジェクト B 用の VirtualFS
    const vfsProjectB = {
      readdir: jest.fn<() => Promise<string[]>>().mockResolvedValue(['artB.yaml']),
      readFile: jest.fn<() => Promise<string>>().mockResolvedValue("ID: 'artB'\nName: ProjectB"),
      writeFile: jest.fn<() => Promise<void>>(),
      unlink: jest.fn<() => Promise<void>>()
    } as unknown as VirtualFsInstance;

    const reposA = createRepositories(vfsProjectA);
    const reposB = createRepositories(vfsProjectB);

    const artifactsA = await reposA.artifactRepository.getAll();
    const artifactsB = await reposB.artifactRepository.getAll();

    expect(artifactsA[0].ID).toBe('artA');
    expect(artifactsB[0].ID).toBe('artB');
  });
});
