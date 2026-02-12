import type { VirtualFsInstance } from '../types/models';

type OpfsStorageClass = any;

type VirtualFsClass = any;

/**
 * 処理名: VirtualFSマネージャー
 * 処理概要: プロジェクトごとのVirtualFSインスタンスを管理
 */
export class VirtualFsManager {
  private currentVfs: VirtualFsInstance | null = null;
  private OpfsStorage: OpfsStorageClass;
  private VirtualFS: VirtualFsClass;

  /**
   * コンストラクタ
   * @param OpfsStorage - OPFSストレージクラス
   * @param VirtualFS - VirtualFSクラス
   */
  constructor(OpfsStorage: OpfsStorageClass, VirtualFS: VirtualFsClass) {
    this.OpfsStorage = OpfsStorage;
    this.VirtualFS = VirtualFS;
  }

  /**
   * 処理名: プロジェクトを開く
   * @param projectName - プロジェクト名
   * @returns VirtualFSインスタンス
   */
  async openProject(projectName: string): Promise<VirtualFsInstance> {
    // If a VFS is already open, attempt to clean it up to avoid leaked resources
    if (this.currentVfs) {
      try {
        const cur: any = this.currentVfs;
        if (typeof cur.close === 'function') await cur.close();
        else if (typeof cur.dispose === 'function') await cur.dispose();
        else if (typeof cur.destroy === 'function') await cur.destroy();
      } catch (e) {
        console.warn('[VirtualFsManager] cleanup error:', e)
      }
      this.currentVfs = null;
    }

    const backend = new this.OpfsStorage('data-mgmt-system', projectName);
    const vfs = new this.VirtualFS({ backend }) as VirtualFsInstance;
    if (typeof (vfs as any).init === 'function') await (vfs as any).init();
    this.currentVfs = vfs;
    return vfs;
  }

  /**
   * 処理名: プロジェクトを閉じる
   */
  closeProject(): void {
    if (this.currentVfs) {
      try {
        const cur: any = this.currentVfs;
        if (typeof cur.close === 'function') cur.close();
        else if (typeof cur.dispose === 'function') cur.dispose();
        else if (typeof cur.destroy === 'function') cur.destroy();
      } catch (e) {
        console.warn('[VirtualFsManager] close error:', e)
      }
    }
    this.currentVfs = null;
  }

  /**
   * 処理名: 現在のVFS取得
   * @returns 現在のVirtualFSインスタンス
   */
  getCurrentVfs(): VirtualFsInstance {
    if (!this.currentVfs) {
      throw new Error('プロジェクトが未オープンです');
    }
    return this.currentVfs;
  }

  /**
   * 処理名: プロジェクト一覧取得
   * @returns プロジェクト名の配列
   */
  async listProjects(): Promise<string[]> {
    if (!this.OpfsStorage.availableRoots) {
      throw new Error('OpfsStorage.availableRoots is not defined');
    }
    return this.OpfsStorage.availableRoots('data-mgmt-system');
  }
}
