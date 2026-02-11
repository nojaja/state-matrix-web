# VirtualFS移行 詳細設計 v0.0.5

## ✅ 実装進捗

### フェーズ1: コア基盤（完了）
- [x] **VirtualFsManager** - VirtualFSのライフサイクル管理
  - ✅ openProject / closeProject / getCurrentVfs / listProjects 実装完了
  - ✅ テスト 4/4 PASS
  - 📁 ファイル: `src/lib/virtualFsManager.ts`
  - 📁 テスト: `test/unit/behavior/v0.0.5/virtualfs/virtualFsManager.test.ts`

- [x] **ProjectConfigRepository** - GitHub/GitLab設定の読み書き
  - ✅ getAdapter / setAdapter 実装完了
  - ✅ テスト 3/3 PASS
  - 📁 ファイル: `src/repositories/projectConfigRepository.ts`
  - 📁 テスト: `test/unit/behavior/v0.0.5/virtualfs/projectConfigRepository.test.ts`

- [x] **VirtualFsRepository** - YAML CRUD共通基盤
  - ✅ getAll / get / save / delete 実装完了
  - ✅ テスト 6/6 PASS（エラーハンドリング含む）
  - 📁 ファイル: `src/repositories/base/virtualFsRepository.ts`
  - 📁 テスト: `test/unit/behavior/v0.0.5/virtualfs/virtualFsRepository.test.ts`

- [x] **createRepositories ファクトリ関数** - エンティティリポジトリファクトリ
  - ✅ 全エンティティリポジトリ（Artifact, Category等）のファクトリ実装完了
  - ✅ テスト 2/2 PASS
  - 📁 ファイル: `src/repositories/index.ts`
  - 📁 テスト: `test/unit/behavior/v0.0.5/virtualfs/createRepositories.test.ts`

- [x] **VirtualFsInstance 型定義**
  - ✅ init / readFile / writeFile / readdir / unlink 等定義完了
  - ✅ getAdapter / setAdapter も含む
  - 📁 ファイル: `src/types/models.ts`

- [x] **統合テスト** - VirtualFS + Store統合動作確認
  - ✅ 複数プロジェクトの分離動作テスト完了
  - ✅ テスト 4/4 PASS
  - 📁 テスト: `test/unit/behavior/v0.0.5/virtualfs/artifactStore.integration.test.ts`

**合計テスト成功: 18/18 PASS** ✅

### フェーズ2: ストア統合（未着手）
- [ ] **各ストア（artifactStore, categoryStore等）を新パターンに更新**
  - init アクション内で VirtualFsManager + createRepositories を使用
  - CRUD 操作を VirtualFsRepository 経由に
- [ ] **既存テストとの互換性確保**
  - OpfsRepository は @deprecated として保持
  - 既存ストアテストは引き続き動作

### フェーズ3: UI統合・エンドツーエンド（未着手）
- [ ] プロジェクト切替フロー統合テスト
- [ ] 同期フロー統合テスト
- [ ] エラーハンドリング統合テスト

---

## 目的
- 既存のOPFS直操作を廃止し、browser-git-opsのVirtualFSを中核に据えたファイル管理へ移行する。
- プロジェクト単位の分離をストレージレイヤーで実現し、UIからの直接呼び出しに整理する。
- GitHub/GitLabの同期設定・参照をVirtualFS経由に統一する。

## 非目的
- 具体的な実装やコードの追加は行わない。
- 旧データの移行手順の詳細化は別途検討とする。

## 前提・要件
- プロジェクト分離は `OpfsStorage('data-mgmt-system', <selectedProject>)` の2引数で行う。
- VirtualFSインスタンスはプロジェクト切替時に破棄し、再生成する。
- プロジェクト一覧は `OpfsStorage.availableRoots('data-mgmt-system')` で取得する。
- GitHub/GitLab設定はVirtualFSの `setAdapter` / `getAdapter` で扱う。
- `getAdapter()` の返却形式は加工せず、そのままUIへ表示する。
  - token入力はUI側でinput type="password"を使用する。
- RepositoryWorkerは廃止し、UI直呼びに統一する。

## 全体アーキテクチャ（概念）
- UI -> Project/Repository層 -> VirtualFS -> OpfsStorage
- Workerを挟まず、UIから同期とCRUDを直接呼び出す。

## 具体的なモジュール分割案
### 1. VirtualFsManager（新設）
責務: VirtualFSの生成・破棄・取得、プロジェクト一覧取得。
- openProject(projectName): VirtualFSを生成して初期化する。
- closeProject(): 現在のVirtualFS参照を破棄する。
- getCurrentVfs(): 現在選択中のVirtualFSを返す。
- listProjects(): availableRootsからプロジェクト一覧を取得する。

### 2. ProjectConfigRepository（新設または既存拡張）
責務: プロジェクト設定（GitHub/GitLab情報）の保存と取得。
- 設定はVirtualFSのgetAdapter/setAdapterと同期。
- UI表示用の読み出しはgetAdapterの返却値をそのまま利用。

### 3. EntityRepository群（再設計）
責務: YAMLエンティティのCRUD。
- 例: ArtifactRepository, CategoryRepository, ProcessRepository, ProjectRepository, TriggerRepository。
- VirtualFS APIで `readFile/writeFile/readdir/unlink` を利用。
- YAMLの読み書きは現行通り `js-yaml` を継続。

### 4. UI層（Pinia Store + View）
責務: Repository経由でデータ操作。
- openProject後にinitを呼ぶ構成へ整理。
- Worker依存のAPIは削除する。

## Repository層の具体的なクラス/ファイル構成案
### 新規ファイル
- src/lib/virtualFsManager.ts
  - VirtualFSのライフサイクル管理とプロジェクト一覧取得を担当。
- src/repositories/base/virtualFsRepository.ts
  - YAML CRUDの共通処理を集約。
- src/repositories/projectConfigRepository.ts
  - getAdapter/setAdapterの窓口。

### 既存/再構成ファイル
- src/repositories/artifactRepository.ts
- src/repositories/categoryRepository.ts
- src/repositories/processRepository.ts
- src/repositories/projectRepository.ts
- src/repositories/triggerRepository.ts
  - 各エンティティのルートディレクトリ名と型を定義。
  - 共通CRUDはvirtualFsRepositoryに委譲。

### インデックス統合
- src/repositories/index.ts
  - Repositoryの集約エクスポート。
  - 既存のOpfsRepository参照は削除する方針。

### 依存関係（概念）
- UI/Store -> EntityRepository -> VirtualFsManager.getCurrentVfs() -> VirtualFS
- UI/Setting -> ProjectConfigRepository -> VirtualFsManager.getCurrentVfs() -> VirtualFS

## Repository層のクラス責務（詳細）
### VirtualFsManager
- openProject(projectName)
  - OpfsStorage('data-mgmt-system', projectName)を生成。
  - VirtualFS({ backend })を生成しinitを実行。
- closeProject()
  - 現在のVirtualFS参照を破棄（イベント解除/キャッシュ破棄は設計方針で整理）。
- getCurrentVfs()
  - 未初期化時は例外またはnullを返す方針（実装時に統一）。
- listProjects()
  - OpfsStorage.availableRoots('data-mgmt-system')を返す。

### VirtualFsRepository（共通基盤）
- constructor(entityDir: string)
  - entityDir配下にYAMLを保存する。
- getAll()/get(id)/save(item)/delete(id)
  - VirtualFSのreadFile/writeFile/readdir/unlinkを利用。
- YAMLのエンコード/デコードはjs-yamlに統一。

### Entity Repository
- entityDirを定義し、型に合わせた薄いラッパーに徹する。
- 例: ArtifactRepositoryは'Artifacts'や'artifacts'など既存規約に準拠。

### ProjectConfigRepository
- getAdapter()
  - VirtualFS.getAdapter()をそのまま返す。
- setAdapter(adapter)
  - UI入力値をそのままVirtualFS.setAdapter()に渡す。

## 例: ディレクトリ命名規約（案）
- artifacts/
- categories/
- processes/
- projects/
- triggers/

## 例: リポジトリ作成の流れ（概念）
1. openProject(projectName)
2. VirtualFsManager.getCurrentVfs()取得
3. EntityRepositoryを生成（必要ならDI）
4. store.init()でgetAllを呼び一覧を更新

## Repository層のAPI仕様（案）
### 共通インターフェース（概念）
- getAll(): Promise<T[]>
- get(id: string): Promise<T | null>
- save(item: T): Promise<void>
- delete(id: string): Promise<void>

### 実装ポリシー
- YAMLファイル名は `<ID>.yaml`。
- 保存先パスはリポジトリのentityルート配下。
- readdir結果を `.yaml` に限定し、並列読み込みを行う。
- パース失敗はログ出力のみでスキップ。

## UI影響点の整理
### 1. プロジェクト一覧
- 取得元を `OpfsStorage.availableRoots('data-mgmt-system')` に変更。
- 既存のプロジェクト選択UIはこの結果で描画。

### 2. プロジェクト設定（GitHub/GitLab）
- 表示: `VirtualFS.getAdapter()` の返却値をそのまま使用。
- 入力: tokenは `input type="password"` でマスク。
- 保存: `VirtualFS.setAdapter()` で反映。

### 3. 同期ボタン/同期フロー
- 既存のRepositoryWorker経由の処理を廃止。
- UIからVirtualFSの `pull/push/getChangeSet` を直接呼ぶ。

### 4. エラー表示
- VirtualFS APIからの例外をUIで捕捉し、既存のエラーハンドリングに統合。

## UI影響点の詳細（画面・ストア単位）
### 画面: プロジェクト一覧/プロジェクト選択
- 変更点
  - データ取得元をVirtualFsManager.listProjects()へ置換。
  - 既存のProject一覧取得API（OPFS直操作/RepositoryWorker経由）は廃止。
- 影響する操作
  - 初期表示時の一覧取得
  - プロジェクト切替時の再取得
- 追加の考慮事項
  - listProjectsの結果が空の場合のUIメッセージ

### 画面: プロジェクト設定（GitHub/GitLab）
- 変更点
  - 表示値はVirtualFS.getAdapter()の返却値をそのまま表示。
  - token入力はtype="password"でマスク。
  - 保存時にVirtualFS.setAdapter()を直接呼び出す。
- 影響する操作
  - 設定画面の初期表示
  - 保存ボタン押下
  - 設定保存後のUI反映
- 追加の考慮事項
  - tokenの再表示/再入力の扱い（マスク表示のまま保持）

### 画面: 同期操作（push/pull/差分）
- 変更点
  - RepositoryWorker経由の同期を廃止し、UIからVirtualFS APIを直呼び。
  - 変更差分はVirtualFS.getChangeSet()で取得。
- 影響する操作
  - pull実行
  - push実行
  - 差分確認の更新
- 追加の考慮事項
  - メインスレッド負荷によるUIブロック対策（ローディング表示）
  - 失敗時の再試行導線

### 画面: エンティティ一覧/詳細（Artifacts/Categories/Processes/Projects/Triggers）
- 変更点
  - CRUDの呼び出し先を各EntityRepositoryへ統一。
  - RepositoryWorker依存の取得・保存処理は廃止。
- 影響する操作
  - 一覧表示
  - 詳細表示
  - 追加/更新/削除
- 追加の考慮事項
  - openProject後にinitを呼ぶ順序の明示化

### ストア: 共通影響点（Pinia）
- 変更点
  - init/fetchAllがVirtualFS前提になるため、未初期化時のハンドリングを追加。
  - Worker呼び出しを削除し、Repositoryへ直接依存。
- 影響するストア
  - artifactStore
  - categoryStore
  - processStore
  - projectStore
  - triggerStore

### ストア: プロジェクト設定ストア（追加/拡張）
- 役割
  - getAdapter/setAdapterの結果を保持しUIへ渡す。
- 変更点
  - 保存完了時に画面へ反映。
  - エラー時の表示を統一。

## プロジェクト切替時のライフサイクル
1. 現在のVirtualFSをcloseProjectで破棄
2. 新しいプロジェクト名でopenProjectを実行
3. VirtualFS.init() を完了
4. Repositoryのinit/refreshを呼び、UI更新

## 同期フロー（概念）
- setAdapter(設定値)
- pull(ref?)
- 変更作成（writeFile等）
- getChangeSet()で差分確認
- push(message)

## 互換性・移行リスク
- 旧OPFS構成との互換性がない場合はデータ移行が必要。
- getAdapterのtokenをそのまま表示するため、UI側でマスキング必須。
- Worker廃止により重い同期操作がメインスレッドで動作する可能性。

## 検討課題（未確定）
- 旧データの移行ツール/手順の設計
- VirtualFSのキャッシュ戦略（プロジェクト切替時のメモリ解放）
- 同期エラー時のUIガイド（再試行/差分破棄）

## 参照
- browser-git-ops README / README_ja
- docs/typedoc-md/README.md
