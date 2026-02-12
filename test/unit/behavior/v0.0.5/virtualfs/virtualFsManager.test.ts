import { beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';

/**
 * 処理名: OPFSストレージモック
 */
class MockOpfsStorage {
  static availableRoots = jest.fn();
  rootName: string;
  projectName: string;

  /**
   * コンストラクタ
   * @param rootName - ルート名
   * @param projectName - プロジェクト名
   */
  constructor(rootName: string, projectName: string) {
    this.rootName = rootName;
    this.projectName = projectName;
  }
}

/**
 * initモック
 */
const initMock = jest.fn();
/**
 * VirtualFSコンストラクタモック
 */
const virtualFsCtor = jest.fn().mockImplementation((args: { backend: unknown }) => ({
  init: initMock,
  backend: args.backend
}));

let VirtualFsManager: any;

beforeAll(async () => {
  const mod = await import('../../../../../src/lib/virtualFsManager');
  VirtualFsManager = mod.VirtualFsManager;
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('VirtualFsManager', () => {
  it('listProjects uses availableRoots with fixed system name', async () => {
    (MockOpfsStorage.availableRoots as any).mockResolvedValue(['projA', 'projB']);
    const manager = new VirtualFsManager(MockOpfsStorage as any, virtualFsCtor);

    const result = await manager.listProjects();

    expect(MockOpfsStorage.availableRoots).toHaveBeenCalledWith('data-mgmt-system');
    expect(result).toEqual(['projA', 'projB']);
  });

  it('openProject creates vfs with opfs backend and calls init', async () => {
    const manager = new VirtualFsManager(MockOpfsStorage as any, virtualFsCtor);

    await manager.openProject('projA');

    expect(virtualFsCtor).toHaveBeenCalledTimes(1);
    const backendArg = (virtualFsCtor.mock.calls[0][0] as { backend: unknown }).backend as MockOpfsStorage;
    expect(backendArg).toBeInstanceOf(MockOpfsStorage);
    expect(backendArg.rootName).toBe('data-mgmt-system');
    expect(backendArg.projectName).toBe('projA');
    expect(initMock).toHaveBeenCalledTimes(1);
  });

  it('getCurrentVfs throws before openProject', () => {
    const manager = new VirtualFsManager(MockOpfsStorage as any, virtualFsCtor);

    expect(() => manager.getCurrentVfs()).toThrow();
  });

  it('closeProject clears current vfs', async () => {
    const manager = new VirtualFsManager(MockOpfsStorage as any, virtualFsCtor);
    await manager.openProject('projA');

    manager.closeProject();

    expect(() => manager.getCurrentVfs()).toThrow();
  });
});
