import * as yaml from 'js-yaml';
import type { VirtualFsInstance } from '../../types/models';

/**
 * VirtualFSベースの汎用リポジトリ
 * YAMLファイルの CRUD を VirtualFS 経由で行う
 */
export class VirtualFsRepository<T extends { ID: string }> {
  private entityDir: string;
  private vfs: VirtualFsInstance;

  /**
   * コンストラクタ
   * @param entityDir - エンティティディレクトリパス
   * @param vfs - VirtualFsインスタンス
   */
  constructor(entityDir: string, vfs: VirtualFsInstance) {
    this.entityDir = entityDir;
    this.vfs = vfs;
  }

  /**
   * エンティティディレクトリ内の全YAMLファイルを読み込む
   * @returns エンティティの配列
   */
  async getAll(): Promise<T[]> {
    const files = await this.vfs.readdir(this.entityDir);
    const yamlFiles = files.filter((name: string) => name.endsWith('.yaml'));

    const items: T[] = [];
    const concurrency = 8;
    for (let i = 0; i < yamlFiles.length; i += concurrency) {
      const batch = yamlFiles.slice(i, i + concurrency);
      const results = await Promise.all(
        batch.map(async (file: string) => {
          try {
            const path = `${this.entityDir}/${file}`;
            const text = await this.vfs.readFile(path);
            const data = yaml.load(text) as any;
            // Compatibility mapping for causal relations: if old files contain
            // ActionTriggerTypeID, map to ProcessTypeID by reading the referenced
            // ActionTriggerTypes file.
            if (this.entityDir === 'CausalRelationsTypes' && data && !data.ProcessTypeID && data.ActionTriggerTypeID) {
              try {
                const atPath = `ActionTriggerTypes/${data.ActionTriggerTypeID}.yaml`;
                const atText = await this.vfs.readFile(atPath);
                const atObj = yaml.load(atText) as any;
                if (atObj && atObj.ProcessTypeID) data.ProcessTypeID = atObj.ProcessTypeID;
              } catch (e) {
                // ignore mapping failures, return original data
              }
            }
            return data as T;
          } catch (error) {
            console.error(`Failed to parse ${file}`, error);
            return null;
          }
        })
      );
      for (const data of results) {
        if (data) items.push(data);
      }
    }
    return items;
  }

  /**
   * 指定ID のエンティティを取得
   */
  /**
   * 処理名: IDで取得
   * @param id - エンティティID
   * @returns エンティティまたはnull
   */
  async get(id: string): Promise<T | null> {
    try {
      const path = `${this.entityDir}/${id}.yaml`;
      const text = await this.vfs.readFile(path);
      const data = yaml.load(text) as any;
      if (this.entityDir === 'CausalRelationsTypes' && data && !data.ProcessTypeID && data.ActionTriggerTypeID) {
        try {
          const atPath = `ActionTriggerTypes/${data.ActionTriggerTypeID}.yaml`;
          const atText = await this.vfs.readFile(atPath);
          const atObj = yaml.load(atText) as any;
          if (atObj && atObj.ProcessTypeID) data.ProcessTypeID = atObj.ProcessTypeID;
        } catch (e) {
          // ignore
        }
      }
      return data as T;
    } catch {
      return null;
    }
  }

  /**
   * エンティティを保存
   */
  /**
   * 処理名: 保存
   * @param item - 保存するエンティティ
   */
  async save(item: T): Promise<void> {
    const path = `${this.entityDir}/${item.ID}.yaml`;
    const content = yaml.dump(item);
    await this.vfs.writeFile(path, content);
  }

  /**
   * エンティティを削除
   */
  /**
   * 処理名: 削除
   * @param id - 削除するID
   */
  async delete(id: string): Promise<void> {
    const path = `${this.entityDir}/${id}.yaml`;
    await this.vfs.unlink(path);
  }
}
