import * as yaml from 'js-yaml';

/**
 * 処理名: OPFS リポジトリクラス
 *
 * 処理概要: ブラウザの File System Access API を使って YAML 形式のエンティティを保存/取得/削除する汎用リポジトリ。
 *
 * 実装理由: ファイルベースの永続化を単純化し、テスト時には差し替え可能なレイヤーとして提供するため。
 */
export class OpfsRepository<T extends { ID: string }> {
  private directoryName: string;

  /**
   * 処理名: コンストラクタ
   *
   * 処理概要: リポジトリが操作するディレクトリ名を受け取り初期化する
   *
   * 実装理由: データを名前空間（ディレクトリ）ごとに分離するため
   * @param directoryName 操作対象のディレクトリ名（ネストはスラッシュで指定）
   */
  constructor(directoryName: string) {
    this.directoryName = directoryName;
  }

  /**
   * 処理名: ディレクトリハンドル取得
   *
   * 処理概要: 指定のルート下にある操作対象ディレクトリの FileSystemDirectoryHandle を取得（なければ作成）する
   *
   * 実装理由: ファイル操作の前提となるディレクトリを一元的に解決するため
    * @returns FileSystemDirectoryHandle 操作対象のディレクトリハンドル
   */
  private async getDirectoryHandle(): Promise<FileSystemDirectoryHandle> {
    const root = await navigator.storage.getDirectory();
    // 固定ルートフォルダ名
    const ROOT_DIR = 'data-mgmt-system';

    // まずルートディレクトリを取得（なければ作成）
    let dir: FileSystemDirectoryHandle = await root.getDirectoryHandle(ROOT_DIR, { create: true });

    // this.directoryName はネストされたパス（例: "foo/bar"）を想定
    const parts = this.directoryName.split('/').filter(p => p && p.length > 0);
    for (const part of parts) {
      dir = await dir.getDirectoryHandle(part, { create: true });
    }

    return dir;
  }

  /**
   * 処理名: 全取得
   *
   * 処理概要: 対象ディレクトリ内の YAML ファイルを全て読み込み、オブジェクト配列として返す
   *
   * 実装理由: UI 側で一覧表示や検索を行うためのデータ取得用
    * @returns T[] 取得したエンティティ配列
   */
  async getAll(): Promise<T[]> {
    const dir = await this.getDirectoryHandle();
    const items: T[] = [];
    
    // @ts-ignore - TS definition might correspond to older spec
    for await (const [name, handle] of dir.entries()) {
      if (handle.kind === 'file' && name.endsWith('.yaml')) {
        const fileHandle = handle as FileSystemFileHandle;
        const file = await fileHandle.getFile();
        const text = await file.text();
        try {
          const data = yaml.load(text) as T;
          items.push(data);
        } catch (_e) {
          console.error(`Failed to parse ${name}`, _e);
        }
      }
    }
    return items;
  }

  /**
   * 処理名: 単一取得
   *
   * 処理概要: 指定 ID の YAML ファイルを読み込み、オブジェクトとして返す。存在しなければ null を返す
   *
   * 実装理由: 個別アイテムの表示・編集で使用するため
  * @param id 検索するエンティティの ID
  * @returns エンティティまたは null
  */
  async get(id: string): Promise<T | null> {
    const dir = await this.getDirectoryHandle();
    try {
      const fileHandle = await dir.getFileHandle(`${id}.yaml`);
      const file = await fileHandle.getFile();
      const text = await file.text();
      return yaml.load(text) as T;
    } catch {
      return null;
    }
  }

  /**
   * 処理名: 保存
   *
   * 処理概要: オブジェクトを YAML 化してファイルに書き込む
   *
   * 実装理由: エンティティの永続化を行うため
   * @param item 保存するエンティティ
   * @returns Promise<void>
   */
  async save(item: T): Promise<void> {
    const dir = await this.getDirectoryHandle();
    const fileHandle = await dir.getFileHandle(`${item.ID}.yaml`, { create: true });
    // FileSystemFileHandle.createWritable() is available in main thread
    const writable = await fileHandle.createWritable();
    const content = yaml.dump(item);
    await writable.write(content);
    await writable.close();
  }

  /**
   * 処理名: 削除
   *
   * 処理概要: 指定 ID の YAML ファイルを削除する
   *
   * 実装理由: エンティティの削除操作を提供するため
   * @param id 削除するエンティティの ID
   * @returns Promise<void>
   */
  async delete(id: string): Promise<void> {
    const dir = await this.getDirectoryHandle();
    await dir.removeEntry(`${id}.yaml`);
  }
}
