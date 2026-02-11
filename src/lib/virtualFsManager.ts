import type { VirtualFsInstance } from '../types/models';

type OpfsStorageClass = {
  new (rootName: string, projectName: string): unknown;
  availableRoots?: (rootName: string) => Promise<string[]>;
};

type VirtualFsClass = new (opts: { backend: unknown }) => VirtualFsInstance;

export class VirtualFsManager {
  private currentVfs: VirtualFsInstance | null = null;
  private OpfsStorage: OpfsStorageClass;
  private VirtualFS: VirtualFsClass;

  constructor(OpfsStorage: OpfsStorageClass, VirtualFS: VirtualFsClass) {
    this.OpfsStorage = OpfsStorage;
    this.VirtualFS = VirtualFS;
  }

  async openProject(projectName: string): Promise<VirtualFsInstance> {
    // If a VFS is already open, attempt to clean it up to avoid leaked resources
    if (this.currentVfs) {
      try {
        const cur: any = this.currentVfs;
        if (typeof cur.close === 'function') await cur.close();
        else if (typeof cur.dispose === 'function') await cur.dispose();
        else if (typeof cur.destroy === 'function') await cur.destroy();
      } catch (e) {
        // ignore cleanup errors
      }
      this.currentVfs = null;
    }

    const backend = new this.OpfsStorage('data-mgmt-system', projectName);
    const vfs = new this.VirtualFS({ backend }) as VirtualFsInstance;
    if (typeof (vfs as any).init === 'function') await (vfs as any).init();
    this.currentVfs = vfs;
    return vfs;
  }

  closeProject(): void {
    if (this.currentVfs) {
      try {
        const cur: any = this.currentVfs;
        if (typeof cur.close === 'function') cur.close();
        else if (typeof cur.dispose === 'function') cur.dispose();
        else if (typeof cur.destroy === 'function') cur.destroy();
      } catch (_e) {
        // ignore
      }
    }
    this.currentVfs = null;
  }

  getCurrentVfs(): VirtualFsInstance {
    if (!this.currentVfs) {
      throw new Error('プロジェクトが未オープンです');
    }
    return this.currentVfs;
  }

  async listProjects(): Promise<string[]> {
    if (!this.OpfsStorage.availableRoots) {
      throw new Error('OpfsStorage.availableRoots is not defined');
    }
    return this.OpfsStorage.availableRoots('data-mgmt-system');
  }
}
