import type { VirtualFsManager } from '../lib/virtualFsManager';
import type { VirtualFsInstance } from '../types/models';

type AdapterMeta = { type: string; opts?: Record<string, unknown> };

/**
 * 処理名: プロジェクト設定リポジトリ
 * 処理概要: VirtualFSのアダプタ設定を管理
 */
export class ProjectConfigRepository {
  private manager: VirtualFsManager;

  /**
   * コンストラクタ
   * @param manager - VirtualFSマネージャー
   */
  constructor(manager: VirtualFsManager) {
    this.manager = manager;
  }

  /**
   * 処理名: アダプタ取得
   * @returns アダプタ情報またはnull
   */
  async getAdapter(): Promise<AdapterMeta | null> {
    const vfs = this.manager.getCurrentVfs() as VirtualFsInstance | null;
    if (!vfs || !vfs.getAdapter) {
      throw new Error('プロジェクトが未オープンです');
    }
    return vfs.getAdapter();
  }

  /**
   * アダプター設定を永続化
   * @param input - アダプターメタ情報
   */
  async setAdapter(input: AdapterMeta): Promise<void> {
    const vfs = this.manager.getCurrentVfs() as VirtualFsInstance | null;
    if (!vfs || !vfs.setAdapter) {
      throw new Error('プロジェクトが未オープンです');
    }
    // browser-git-ops v0.0.5 expects setAdapter(null, meta)
    await vfs.setAdapter(null, input);
  }
}
