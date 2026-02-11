import * as yaml from 'js-yaml';

type VirtualFsInstance = {
  readFile: (path: string) => Promise<string>;
  writeFile: (path: string, content: string) => Promise<void>;
  readdir: (path: string) => Promise<string[]>;
  unlink: (path: string) => Promise<void>;
};

/**
 * VirtualFSベースの汎用リポジトリ
 * YAMLファイルの CRUD を VirtualFS 経由で行う
 */
export class VirtualFsRepository<T extends { ID: string }> {
  private entityDir: string;
  private vfs: VirtualFsInstance;

  constructor(entityDir: string, vfs: VirtualFsInstance) {
    this.entityDir = entityDir;
    this.vfs = vfs;
  }

  /**
   * エンティティディレクトリ内の全YAMLファイルを読み込む
   */
  async getAll(): Promise<T[]> {
    const files = await this.vfs.readdir(this.entityDir);
    const yamlFiles = files.filter((name) => name.endsWith('.yaml'));

    const items: T[] = [];
    const concurrency = 8;
    for (let i = 0; i < yamlFiles.length; i += concurrency) {
      const batch = yamlFiles.slice(i, i + concurrency);
      const results = await Promise.all(
        batch.map(async (file) => {
          try {
            const path = `${this.entityDir}/${file}`;
            const text = await this.vfs.readFile(path);
            return yaml.load(text) as T;
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
  async get(id: string): Promise<T | null> {
    try {
      const path = `${this.entityDir}/${id}.yaml`;
      const text = await this.vfs.readFile(path);
      return yaml.load(text) as T;
    } catch {
      return null;
    }
  }

  /**
   * エンティティを保存
   */
  async save(item: T): Promise<void> {
    const path = `${this.entityDir}/${item.ID}.yaml`;
    const content = yaml.dump(item);
    await this.vfs.writeFile(path, content);
  }

  /**
   * エンティティを削除
   */
  async delete(id: string): Promise<void> {
    const path = `${this.entityDir}/${id}.yaml`;
    await this.vfs.unlink(path);
  }
}
