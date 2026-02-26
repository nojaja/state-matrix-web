/**
 * @test-type behavior
 * @spec docs/spec/v0.0.7/browser-git-ops-v007-migration-design.md
 * @purpose ProjectConfigRepository が v0.0.7 の setAdapter(meta) API を使用することを検証
 *
 * 設計書 §6.7 / §10.3:
 *   - browser-git-ops v0.0.7 では setAdapter(null, input) ではなく setAdapter(input) を呼ぶ
 *
 * 設計書 付録B.1:
 *   - expect(mockVfs.setAdapter).toHaveBeenCalledWith({ type: 'github', opts: { ... } })
 */
import { beforeAll, describe, expect, it, jest } from '@jest/globals';

type AdapterMeta = { type: string; opts?: Record<string, unknown> };

let ProjectConfigRepository: any;

beforeAll(async () => {
  const mod = await import('../../../../../src/repositories/projectConfigRepository');
  ProjectConfigRepository = mod.ProjectConfigRepository;
});

describe('ProjectConfigRepository (v0.0.7 setAdapter API)', () => {
  it('setAdapter は vfs.setAdapter(input) を呼び出す（null を第一引数に渡さない）', async () => {
    const vfs = {
      setAdapter: (jest.fn() as jest.MockedFunction<any>).mockResolvedValue(undefined)
    };
    const manager = { getCurrentVfs: jest.fn(() => vfs) };
    const repo = new ProjectConfigRepository(manager);
    const input: AdapterMeta = {
      type: 'github',
      opts: { owner: 'owner', repo: 'repo', token: 'token', branch: 'main' }
    };

    await repo.setAdapter(input);

    // v0.0.7: setAdapter(meta) を直接呼び出す（§10.3）
    expect(vfs.setAdapter).toHaveBeenCalledWith(input);
    // null を第一引数に渡していないことを確認
    expect(vfs.setAdapter).not.toHaveBeenCalledWith(null, expect.anything());
  });

  it('setAdapter は GitLab の AdapterMeta でも null を渡さず呼び出す', async () => {
    const vfs = {
      setAdapter: (jest.fn() as jest.MockedFunction<any>).mockResolvedValue(undefined)
    };
    const manager = { getCurrentVfs: jest.fn(() => vfs) };
    const repo = new ProjectConfigRepository(manager);
    const input: AdapterMeta = {
      type: 'gitlab',
      opts: { projectId: 'group/project', host: 'https://gitlab.example.com', token: 'glpat_xxx', branch: 'dev' }
    };

    await repo.setAdapter(input);

    // v0.0.7: setAdapter(meta) — 第一引数は AdapterMeta オブジェクト
    expect(vfs.setAdapter).toHaveBeenCalledTimes(1);
    expect(vfs.setAdapter).toHaveBeenCalledWith(input);
    // 呼び出し引数が 1 つであること（null + meta の2引数ではない）
    expect(vfs.setAdapter.mock.calls[0]).toHaveLength(1);
  });

  it('getAdapter は従来通り vfs.getAdapter() の結果を返す', async () => {
    const adapter: AdapterMeta = {
      type: 'github',
      opts: { owner: 'owner', repo: 'repo', token: 'token', branch: 'main' }
    };
    const vfs = {
      getAdapter: (jest.fn() as jest.MockedFunction<
        () => Promise<AdapterMeta | null>
      >).mockResolvedValue(adapter)
    };
    const manager = { getCurrentVfs: jest.fn(() => vfs) };
    const repo = new ProjectConfigRepository(manager);

    const result = await repo.getAdapter();

    expect(vfs.getAdapter).toHaveBeenCalledTimes(1);
    expect(result).toBe(adapter);
  });

  it('プロジェクト未オープン時は例外を投げる', async () => {
    const manager = { getCurrentVfs: jest.fn(() => null) };
    const repo = new ProjectConfigRepository(manager);

    await expect(repo.getAdapter()).rejects.toThrow();
  });
});
