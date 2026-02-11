import type { VirtualFsManager } from '../lib/virtualFsManager';

type AdapterMeta = { type: string; opts?: Record<string, unknown> };

type VirtualFsInstance = {
  getAdapter?: () => Promise<AdapterMeta | null>;
  setAdapter?: (adapterArg: any, meta?: AdapterMeta) => Promise<void>;
};

export class ProjectConfigRepository {
  private manager: VirtualFsManager;

  constructor(manager: VirtualFsManager) {
    this.manager = manager;
  }

  async getAdapter(): Promise<AdapterMeta | null> {
    const vfs = this.manager.getCurrentVfs() as VirtualFsInstance | null;
    if (!vfs || !vfs.getAdapter) {
      throw new Error('プロジェクトが未オープンです');
    }
    return vfs.getAdapter();
  }

  async setAdapter(input: AdapterMeta): Promise<void> {
    const vfs = this.manager.getCurrentVfs() as VirtualFsInstance | null;
    if (!vfs || !vfs.setAdapter) {
      throw new Error('プロジェクトが未オープンです');
    }
    // browser-git-ops v0.0.5 expects setAdapter(null, meta)
    await vfs.setAdapter(null, input);
  }
}
