import { beforeAll, describe, expect, it, jest } from '@jest/globals';

type AdapterMeta = { type: string; opts?: Record<string, unknown> };

let ProjectConfigRepository: any;

beforeAll(async () => {
  const mod = await import('../../../../../src/repositories/projectConfigRepository');
  ProjectConfigRepository = mod.ProjectConfigRepository;
});

describe('ProjectConfigRepository', () => {
  it('getAdapter returns vfs.getAdapter result', async () => {
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

  it('setAdapter forwards input to vfs.setAdapter', async () => {
    const vfs = {
      setAdapter: (jest.fn() as jest.MockedFunction<any>).mockResolvedValue(undefined)
    };
    const manager = { getCurrentVfs: jest.fn(() => vfs) };
    const repo = new ProjectConfigRepository(manager);
    const input: AdapterMeta = {
      type: 'gitlab',
      opts: { projectId: 'group/project', host: 'gitlab.com', token: 'token', branch: 'main' }
    };

    await repo.setAdapter(input);

    expect(vfs.setAdapter).toHaveBeenCalledWith(null, input);
  });

  it('throws when project is not opened', async () => {
    const manager = { getCurrentVfs: jest.fn(() => null) };
    const repo = new ProjectConfigRepository(manager);

    await expect(repo.getAdapter()).rejects.toThrow();
  });
});
