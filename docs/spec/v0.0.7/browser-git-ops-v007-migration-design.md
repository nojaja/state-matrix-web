# browser-git-ops v0.0.7 移行 詳細設計書

更新日: 2026-02-25  
バージョン: v0.0.7  
対象ライブラリ: [browser-git-ops v0.0.7](https://github.com/nojaja/browser-git-ops/releases/tag/v0.0.7)

---

## 1. 概要

### 1.1 目的
- `browser-git-ops` を v0.0.5 → v0.0.7 にアップデートし、破壊的変更に対応する。
- `VirtualFS#setAdapter` の新 API（`setAdapter(meta)` / `setAdapter(type, url, token?)` / `setAdapter(url)`）を採用し、**旧 `setAdapter(null, meta)` 呼び出しを全て置換**する。
- RepoSettingsModal の入力フォームを新 API に合わせて再設計する。

### 1.2 背景
browser-git-ops はバージョン v0.0.6 で `setAdapter(adapter, meta?)` の第一引数 `adapter` を廃止する破壊的変更を行い、v0.0.7 で URL 解析ベースの新オーバーロード `setAdapter(type, url, token?)` を追加した。

現在の state-matrix-web は v0.0.5 の API である `setAdapter(null, meta)` を使用しており、v0.0.7 では動作しない。

### 1.3 変更スコープ
| カテゴリ | 対象ファイル | 変更内容 |
|----------|------------|----------|
| パッケージ | `package.json` | `browser-git-ops` を `^0.0.7` に更新 |
| 型定義 | `src/shims-browser-git-ops.d.ts` | 新 API シグネチャに合わせて型宣言を更新 |
| 型定義 | `src/types/models.ts` | `VirtualFsInstance` インターフェースを更新 |
| モーダル | `src/components/common/RepoSettingsModal.vue` | `setAdapter` 方式を採用した新 UI に変更 |
| ストア | `src/stores/metadataStore.ts` | `setAdapter(null, meta)` → `setAdapter(meta)` に全置換 |
| リポジトリ | `src/repositories/projectConfigRepository.ts` | `setAdapter(null, input)` → `setAdapter(input)` に置換 |
| テスト | `test/unit/` 配下の関連テスト | モック・呼び出しシグネチャ更新 |

---

## 2. browser-git-ops v0.0.5 → v0.0.7 の API 変更まとめ

### 2.1 `setAdapter` シグネチャ変更（破壊的）

#### v0.0.5（旧）
```typescript
// 第一引数に adapter インスタンスまたは null、第二引数に meta
async setAdapter(adapter: any | null, meta?: any): Promise<void>

// 使用例
await vfs.setAdapter(null, { type: 'github', opts: { owner, repo, token, branch } })
```

#### v0.0.7（新）
```typescript
// オーバーロード 1: AdapterMeta オブジェクトを渡す
async setAdapter(meta: AdapterMeta): Promise<void>

// オーバーロード 2: type + URL + token を渡す（URL解析方式）
async setAdapter(type: string, url: string, token?: string): Promise<void>

// オーバーロード 3: URL のみ渡す（プラットフォーム自動判定）
async setAdapter(url: string): Promise<void>
```

**実際のシグネチャ（TypeDoc抜粋）:**
```typescript
// virtualfs.ts L129 より:
async setAdapter(metaOrTypeOrUrl?: AdapterMeta | string): Promise<void>
// 内部で arguments[1], arguments[2] を参照してオーバーロードを実現
```

### 2.2 AdapterMeta 型定義

```typescript
// browser-git-ops/src/virtualfs/types.ts
interface AdapterMeta {
  type: string       // 'github' | 'gitlab' | string
  opts?: Record<string, any>
}
```

**GitHub 用の opts:**
```typescript
{
  owner: string      // リポジトリオーナー
  repo: string       // リポジトリ名
  token: string      // Personal Access Token
  branch?: string    // ブランチ名（デフォルト: 'main'）
  host?: string      // GitHub Enterprise 用（例: 'https://git.example.com/api/v3'）
}
```

**GitLab 用の opts:**
```typescript
{
  projectId: string  // 'owner/repo' 形式
  token: string      // Personal Access Token
  branch?: string    // ブランチ名（デフォルト: 'main'）
  host?: string      // セルフホスト用（例: 'https://gitlab.example.com'）
}
```

### 2.3 新規追加 API: Adapter 取得/管理メソッド

| メソッド | 説明 |
|---------|------|
| `getAdapter(): Promise<AdapterMeta \| null>` | 永続化された adapter メタデータを取得（インスタンスではなく設定情報） |
| `getAdapterInstance(): Promise<any \| null>` | adapter インスタンスを取得/遅延生成 |
| `getAdapterMeta(): AdapterMeta \| null` | キャッシュされた adapter メタを同期取得（Promise なし） |

### 2.4 StorageBackend コンストラクタ変更

```typescript
// v0.0.5
class OpfsStorage { constructor(rootName?: string) }

// v0.0.7
class OpfsStorage { constructor(namespace: string, rootName?: string) }
```

> **注:** state-matrix-web では既に `new OpfsStorage('data-mgmt-system', projectName)` の2引数で呼び出しているため、この変更への対応は不要。

### 2.5 URL 解析ユーティリティ（`parseAdapterFromUrl`）

v0.0.7 で追加された `setAdapter(type, url, token?)` は内部で `parseAdapterFromUrl` を呼び出し、URL から adapter メタ情報を自動構築する。

```typescript
// 例: GitHub
await vfs.setAdapter('github', 'https://github.com/owner/repo', 'ghp_xxx')
// 内部で parseAdapterFromUrl('https://github.com/owner/repo', 'ghp_xxx', 'github')
// => { type: 'github', opts: { owner: 'owner', repo: 'repo', token: 'ghp_xxx', branch: 'main' } }

// 例: GitLab
await vfs.setAdapter('gitlab', 'https://gitlab.com/group/project', 'glpat_xxx')
// => { type: 'gitlab', opts: { projectId: 'group/project', token: 'glpat_xxx', branch: 'main' } }
```

---

## 3. 現行コードの `setAdapter` 呼び出し箇所一覧

以下が v0.0.5 の旧 API `setAdapter(null, meta)` を使用している全箇所:

### 3.1 `src/components/common/RepoSettingsModal.vue`

```typescript
// L145/L171: deleteToken() / onSave() 内
await vfs.setAdapter(null, buildAdapterPayload({ ...cfg }))
```

### 3.2 `src/stores/metadataStore.ts`

```typescript
// L189: setAdapterWithFallback()
await vfs.setAdapter(null, payload)  // 主経路
await vfs.setAdapter(payload)         // フォールバック

// L535: saveRepoConfig() 内
await vfs.setAdapter(null, adapterPayload)
```

### 3.3 `src/repositories/projectConfigRepository.ts`

```typescript
// L43: setAdapter() 内
await vfs.setAdapter(null, input)  // コメントに "v0.0.5 expects setAdapter(null, meta)"
```

---

## 4. 移行方針の選択: `setAdapter(meta)` vs `setAdapter(type, url, token?)`

### 4.1 方式比較

| 方式 | メリット | デメリット |
|------|---------|-----------|
| `setAdapter(meta)` | 既存コードから `null` を削除するだけで済む。変更量最小。 | URL解析の恩恵を受けない |
| `setAdapter(type, url, token?)` | URL 入力 UI がシンプルになる。ユーザーが owner/repo を個別入力する必要がない | RepoSettingsModal の UI 変更が大きい。branch は URL クエリパラメータで渡す必要がある |
| **ハイブリッド** | 内部処理は `setAdapter(meta)` を使い、UI は `setAdapter(type, url, token?)` 方式の入力形式を採用 | 変換ロジックが必要 |

### 4.2 採用方針

**`setAdapter(type, url, token?)` 方式を採用する。**

理由:
1. ユーザ要件として `setAdapter(type, url, token?)` 方式の採用が明示されている
2. URL 入力により owner / repo / host の個別入力が不要になり UX が向上
3. branch は URL のクエリパラメータ `?branch=xxx` で制御可能
4. token は別途セキュアに入力（URL クエリには入れない）

---

## 5. RepoSettingsModal 再設計

### 5.1 現行 UI 入力フィールド

| フィールド | 説明 | 現行の用途 |
|-----------|------|-----------|
| Provider | `github` / `gitlab` セレクト | `AdapterMeta.type` |
| Host | GitLab のセルフホスト | `opts.host` |
| Owner | リポジトリオーナー | `opts.owner` (GitHub) / `projectId` の前半 (GitLab) |
| Repository | リポジトリ名 | `opts.repo` (GitHub) / `projectId` の後半 (GitLab) |
| Branch | ブランチ名 | `opts.branch` |
| Token | Personal Access Token | `opts.token` |

### 5.2 新 UI 入力フィールド

| フィールド | 説明 | 例 |
|-----------|------|-----|
| Provider | `github` / `gitlab` セレクト | `github` |
| Repository URL | リポジトリの URL | `https://github.com/owner/repo` |
| Branch | ブランチ名（任意、デフォルト: `main`） | `main` |
| Token | Personal Access Token | `ghp_xxx...` |

### 5.3 UI → API 変換ロジック

```typescript
// 新方式: setAdapter(type, url, token?) を使用
// branch は URL のクエリパラメータとして付与

function buildUrlWithBranch(url: string, branch: string): string {
  const u = new URL(url)
  if (branch && branch !== 'main') {
    u.searchParams.set('branch', branch)
  }
  return u.toString()
}

// 呼び出し例
const url = buildUrlWithBranch(cfg.repositoryUrl, cfg.branch)
await vfs.setAdapter(cfg.provider, url, cfg.token)
```

### 5.4 RepoConfig 型変更

```typescript
// 現行
export type RepoConfig = {
  provider: 'github' | 'gitlab'
  owner: string
  repository: string
  branch: string
  host?: string
  token?: string
  lastSyncedCommitSha?: string | null
}

// 新:
export type RepoConfig = {
  provider: 'github' | 'gitlab'
  repositoryUrl: string       // リポジトリ URL（例: https://github.com/owner/repo）
  branch: string              // ブランチ名（デフォルト: main）
  token?: string              // Personal Access Token
  lastSyncedCommitSha?: string | null
}
```

> **後方互換:** 既存の OPFS/IndexedDB 上に保存されたアダプタメタデータは `{ type, opts: { owner, repo, ... } }` 形式のまま。`getAdapter()` で取得されるデータはこの形式を返す。UI 表示時にマッピングが必要。

### 5.5 RepoConfig ↔ URL 変換ヘルパー

```typescript
/**
 * AdapterMeta の opts から Repository URL を構築
 */
function buildUrlFromAdapterOpts(type: string, opts: Record<string, any>): string {
  if (type === 'github') {
    const host = opts.host ? opts.host.replace(/\/api\/v3$/, '') : 'https://github.com'
    return `${host}/${opts.owner}/${opts.repo}`
  }
  if (type === 'gitlab') {
    const host = opts.host || 'https://gitlab.com'
    return `${host}/${opts.projectId}`
  }
  return ''
}

/**
 * AdapterMeta -> RepoConfig 変換（読み込み時）
 */
function buildRepoConfigFromAdapter(adapter: AdapterMeta): RepoConfig {
  const opts = adapter.opts || {}
  const url = buildUrlFromAdapterOpts(adapter.type, opts)
  return {
    provider: adapter.type === 'gitlab' ? 'gitlab' : 'github',
    repositoryUrl: url,
    branch: opts.branch || 'main',
    token: opts.token || undefined,
    lastSyncedCommitSha: null
  }
}
```

---

## 6. 各ファイルの具体的変更内容

### 6.1 `package.json`

```diff
-    "browser-git-ops": "^0.0.5",
+    "browser-git-ops": "^0.0.7",
```

### 6.2 `src/shims-browser-git-ops.d.ts`

```typescript
declare module 'browser-git-ops' {
  export interface AdapterMeta {
    type: string
    opts?: Record<string, any>
  }

  export interface StorageBackend {
    // minimal typing
  }

  export interface StorageBackendConstructor {
    new (namespace: string, rootName?: string): StorageBackend
    availableRoots?(namespace: string): Promise<string[]>
  }

  export const OpfsStorage: StorageBackendConstructor
  export const IndexedDatabaseStorage: StorageBackendConstructor
  export const InMemoryStorage: StorageBackendConstructor

  export class VirtualFS {
    constructor(options?: { backend?: StorageBackend; logger?: any })
    init(): Promise<void>

    // File operations
    readFile(path: string): Promise<string | null>
    writeFile(path: string, content: string): Promise<void>
    readdir(dirpath: string, options?: { withFileTypes?: boolean }): Promise<any[]>
    unlink(path: string): Promise<void>
    mkdir(dirpath: string, options?: { recursive?: boolean; mode?: number }): Promise<void>
    rmdir(dirpath: string, options?: { recursive?: boolean }): Promise<void>
    stat(path: string): Promise<any>
    renameFile(from: string, to: string): Promise<void>

    // Adapter management
    setAdapter(meta: AdapterMeta): Promise<void>
    setAdapter(type: string, url: string, token?: string): Promise<void>
    setAdapter(url: string): Promise<void>
    getAdapter(): Promise<AdapterMeta | null>
    getAdapterInstance(): Promise<any | null>
    getAdapterMeta(): AdapterMeta | null

    // Remote synchronization
    pull(remote?: any, baseSnapshot?: Record<string, string>): Promise<any>
    push(input: any): Promise<{ commitSha: string }>

    // Change management
    getChangeSet(): Promise<any[]>
    getIndex(): Promise<any>

    // Conflict resolution
    getConflicts?(): Promise<any[]>
    resolveConflict?(path: string): Promise<boolean>

    // Branch management
    listBranches(query?: any): Promise<any>
    listCommits(query: any): Promise<any>
    createBranch(input: any): Promise<any>
    getDefaultBranch(): Promise<string | null>
    getRemoteDiffs(remote?: any): Promise<any>
  }

  export default VirtualFS
}
```

### 6.3 `src/types/models.ts` - VirtualFsInstance

```typescript
export interface VirtualFsInstance {
  init(): Promise<void>;
  readFile: Function;
  writeFile: Function;
  readdir: Function;
  unlink: Function;
  mkdir?: Function;
  rmdir?: Function;
  stat?: Function;
  // v0.0.7: setAdapter は meta オブジェクト or (type, url, token?) のオーバーロード
  setAdapter?(...args: any[]): Promise<void>;
  getAdapter?(): Promise<{ type: string; opts?: Record<string, unknown> } | null>;
  getAdapterInstance?(): Promise<any | null>;
  getAdapterMeta?(): { type: string; opts?: Record<string, unknown> } | null;
  getConflicts?(): Promise<ConflictTriple[]>;
  resolveConflict?: Function;
}
```

### 6.4 `src/types/models.ts` - RepoConfig

```typescript
export type RepoConfig = {
  provider: 'github' | 'gitlab'
  repositoryUrl: string       // リポジトリ URL
  branch: string              // ブランチ名
  token?: string              // Personal Access Token
  lastSyncedCommitSha?: string | null
}
```

### 6.5 `src/components/common/RepoSettingsModal.vue`

主な変更:
1. Owner / Repository / Host 入力フィールドを **Repository URL** 1つに統合
2. `buildAdapterPayload` を廃止し、`setAdapter(type, url, token?)` を直接呼び出す
3. 読み込み時は `getAdapter()` から取得した `AdapterMeta.opts` を URL に逆変換して表示

### 6.6 `src/stores/metadataStore.ts`

主な変更:
1. `buildAdapterPayload()` → URL ベースのペイロード構築に変更
2. `setAdapterWithFallback()` → `vfs.setAdapter(meta)` を直接呼び出し（null 不要に）
3. `ensureAdapterOnVfs()` → `setAdapter(meta)` 方式に統一
4. `buildRepoConfigFromAdapter()` → URL 変換ロジックを追加
5. `saveRepoConfig()` → `setAdapter(type, url, token?)` を使用

### 6.7 `src/repositories/projectConfigRepository.ts`

```typescript
// 変更前
await vfs.setAdapter(null, input);

// 変更後（AdapterMeta 方式）
await vfs.setAdapter(input);
```

---

## 7. データ移行・後方互換性

### 7.1 既存 IndexFile 上のアダプタメタデータ

既存プロジェクトの IndexFile には以下の形式でアダプタメタが保存されている:
```json
{
  "adapter": {
    "type": "github",
    "opts": {
      "owner": "xxx",
      "repo": "yyy",
      "token": "ghp_...",
      "branch": "main"
    }
  }
}
```

v0.0.7 の `getAdapter()` はこの形式のデータをそのまま `AdapterMeta` として返す。  
→ **既存データの移行は不要。** 読み込み時の `buildRepoConfigFromAdapter` で自動変換される。

### 7.2 RepoConfig 形式のマイグレーション

`metadataStore.repoConfigs` はインメモリのみで永続化されない（VFS の IndexFile.adapter が真の永続化先）。  
→ **マイグレーション不要。** `loadRepoConfig` が `getAdapter()` → `buildRepoConfigFromAdapter()` で毎回変換する。

---

## 8. 確認ポイントとリスク

### 8.1 破壊的変更による互換性問題

| # | 確認ポイント | 対策 |
|---|------------|------|
| 1 | `setAdapter(null, meta)` が v0.0.7 で動作するか | **動作しない。** v0.0.7 では第一引数が string の場合 URL として解析される。null を渡すとエラーになる。全箇所の書き換えが必須。 |
| 2 | `setAdapter(meta)` でオブジェクトを渡す場合の挙動 | `meta` が object かつ `type` プロパティが string なら AdapterMeta として処理される。既存の `buildAdapterPayload()` の出力がそのまま使える。 |
| 3 | `setAdapter(type, url, token?)` で branch を指定する方法 | URL のクエリパラメータ `?branch=xxx` で渡す。内部の `parseAdapterFromUrl` がクエリから取得する。 |
| 4 | `setAdapter(type, url, token?)` でセルフホスト GitLab を指定する方法 | URL 自体にホスト名が含まれるため自動判定される（例: `https://gitlab.mycompany.com/group/project`）。`parseAdapterFromUrl` がホスト名から GitLab と判定する。 |
| 5 | `setAdapter(type, url, token?)` でセルフホスト GitHub Enterprise を指定する方法 | `type='github'` を明示すれば、ホスト名に関係なく GitHub として処理される。opts.host に `https://git.example.com/api/v3` がセットされる。 |

### 8.2 URL 解析のエッジケース

| # | ケース | 想定動作 |
|---|-------|---------|
| 1 | `https://github.com/owner/repo.git` | `.git` が除去され `{ owner: 'owner', repo: 'repo' }` |
| 2 | `https://github.com/owner/repo?branch=dev` | branch が `dev` に設定される |
| 3 | `https://gitlab.com/group/subgroup/project` | projectId が `group/subgroup/project` に設定される |
| 4 | 不正な URL（パスが不足） | `Error('invalid repository path')` が投げられる |
| 5 | 空文字列の URL | `TypeError('invalid url')` が投げられる |

### 8.3 UI 変更に伴うリスク

| # | リスク | 対策 |
|---|------|------|
| 1 | 既存ユーザーが Owner/Repo 個別入力に慣れている | URL 入力フィールドにプレースホルダーで `https://github.com/owner/repo` を表示。ヘルプテキストも追加。 |
| 2 | URL 入力ミス（スキーマ忘れ等） | バリデーションでスキーマチェックを行い、エラー表示する。 |
| 3 | branch フィールドの廃止/維持 | branch フィールドは引き続き独立入力として残す。URL クエリには含めず、`setAdapter(meta)` 経由で `opts.branch` として渡す方式も選択可。 |

### 8.4 テスト影響

| テストファイル | 影響 |
|-------------|------|
| `test/unit/behavior/v0.0.5/virtualfs/projectConfigRepository.test.ts` | `setAdapter(null, input)` のモック呼び出しを更新 |
| `test/unit/behavior/v0.0.5/virtualfs/virtualFsManager.test.ts` | 影響なし（setAdapter 未使用） |
| `test/unit/stores/metadataStore.*.test.ts` | `setAdapter` のモック呼び出しシグネチャ更新 |
| `test/unit/components/RepoSettingsModal.test.ts` | UI フィールド変更に伴うテスト更新 |

---

## 9. 実装手順

### フェーズ 1: パッケージ更新と型定義修正
1. `package.json` で `browser-git-ops` を `^0.0.7` に更新
2. `npm install` 実行
3. `src/shims-browser-git-ops.d.ts` を新 API に合わせて更新
4. `src/types/models.ts` の `VirtualFsInstance` / `RepoConfig` を更新

### フェーズ 2: 内部 API 呼び出しの修正
5. `src/repositories/projectConfigRepository.ts` の `setAdapter(null, input)` → `setAdapter(input)` に修正
6. `src/stores/metadataStore.ts` の全 `setAdapter` 呼び出しを `setAdapter(meta)` 方式に修正
   - `buildAdapterPayload()` は `{ type, opts }` 形式を返すのでそのまま利用可能
   - `setAdapterWithFallback()` の `setAdapter(null, payload)` → `setAdapter(payload)` に修正
   - `saveRepoConfig()` 内の `setAdapter(null, adapterPayload)` → `setAdapter(adapterPayload)` に修正
   - `buildRepoConfigFromAdapter()` に URL 構築ロジックを追加

### フェーズ 3: RepoSettingsModal UI 変更
7. RepoSettingsModal の template を新フィールド構成に変更
8. `buildAdapterPayload` を新方式（`setAdapter(type, url, token?)` 呼び出し）に変更
9. `loadConfigIfVisible` のマッピングロジック（`AdapterMeta` → 新 `RepoConfig`）を更新

### フェーズ 4: テスト修正と検証
10. 既存ユニットテストの `setAdapter` モック引数を更新
11. RepoSettingsModal のテストを新 UI に合わせて更新
12. 全テスト実行して GREEN を確認

---

## 10. `setAdapter` 呼び出し方式の最終設計

### 10.1 RepoSettingsModal → VFS

```typescript
// RepoSettingsModal での保存処理
async function onSave() {
  const p = projectStore.selectedProject
  if (!p) return

  // metadataStore 経由で保存
  await metadataStore.saveRepoConfig(p, { ...cfg })

  // VFS にも直接反映（defensive）
  const vfs = virtualFsManager.getCurrentVfs()
  if (vfs && typeof vfs.setAdapter === 'function') {
    // setAdapter(type, url, token?) 方式
    const urlWithBranch = buildUrlWithBranch(cfg.repositoryUrl, cfg.branch)
    await vfs.setAdapter(cfg.provider, urlWithBranch, cfg.token)
  }
}
```

### 10.2 metadataStore → VFS

```typescript
// metadataStore 内部での setAdapter 呼び出し
// AdapterMeta 方式を基本とする（既存データとの互換性重視）
async function setAdapterOnVfs(vfs: any, payload: AdapterMeta): Promise<void> {
  await vfs.setAdapter(payload)
}
```

### 10.3 projectConfigRepository → VFS

```typescript
// projectConfigRepository の setAdapter
async setAdapter(input: AdapterMeta): Promise<void> {
  const vfs = this.manager.getCurrentVfs()
  // v0.0.7: setAdapter(meta) を直接呼び出す
  await vfs.setAdapter(input)
}
```

---

## 11. 設計上の決定事項

| # | 決定事項 | 理由 |
|---|---------|------|
| 1 | RepoSettingsModal は `setAdapter(type, url, token?)` 方式を UI 入力の基本とする | ユーザー要件。URL 入力で UX 向上 |
| 2 | metadataStore / projectConfigRepository の内部処理は `setAdapter(meta)` 方式を使う | 既存の `buildAdapterPayload()` との互換性。`getAdapter()` が返す `AdapterMeta` をそのまま `setAdapter` に渡せる |
| 3 | branch フィールドは独立入力として残す | URL クエリパラメータだけでは branch 指定が分かりにくい。明示的な入力の方が UX 上有利 |
| 4 | token は URL クエリに含めない | セキュリティ上のリスク回避 |
| 5 | `RepoConfig` 型を `repositoryUrl` ベースに変更 | Owner / Repository / Host の個別管理が不要になる |
| 6 | 既存 IndexFile 上のデータは移行不要 | `getAdapter()` が返す `AdapterMeta` からの逆変換で対応 |

---

## 付録 A: browser-git-ops v0.0.7 主要変更の抜粋

### A.1 v0.0.5 → v0.0.7 変更コミット一覧

| コミット | 概要 |
|---------|------|
| `c014da7` | `feat(virtualfs): setAdapter の adapter 引数を削除 (v0.0.6)` |
| `1228446` | `refactor: VirtualFS/Storage の責務分離と ESM 互換対応` |
| `ed9802a` | `feat: adapter URL解析ユーティリティと VirtualFS#setAdapter の新オーバーロード追加` |
| `2964416` | `fix(fetch): リトライ枯渇時に RetryExhaustedError を投げるよう修正` |

### A.2 新規追加ファイル（browser-git-ops 側）

- `src/virtualfs/utils/urlParser.ts` — URL 解析ユーティリティ
- `docs/spec/v0.0.6/setAdapter_remove_adapter_arg.md` — adapter 引数削除の設計書
- `docs/spec/v0.0.7/adapter-url-parsing-design.md` — URL解析 + setAdapter 新オーバーロードの設計書
- `docs/spec/v0.0.7/fetch-with-retry-failure-handling.md` — fetchWithRetry のリトライ枯渇エラー設計書

### A.3 VirtualFS.setAdapter の内部実装フロー

```
setAdapter(arg1, arg2?, arg3?)
  │
  ├─ arg1 がオブジェクト → AdapterMeta として処理
  │   └─ _parseAdapterArgs(meta) → meta をそのまま返す
  │
  ├─ arg1 が文字列 かつ arg2 が文字列 → (type, url, token?)
  │   └─ _parseAdapterArgs(type, url, token?)
  │       └─ parseAdapterFromUrl(url, token, type)
  │           └─ URL パース → プラットフォーム判定 → opts 構築
  │               └─ { type, opts } を返す
  │
  └─ arg1 が文字列 かつ arg2 が undefined → (url)
      └─ _parseAdapterArgs(url)
          └─ parseAdapterFromUrl(url)
              └─ URL + ホスト名からプラットフォーム自動判定

→ 正規化された AdapterMeta を adapterMeta に保存
→ _tryPersistAdapterMeta() で IndexFile に永続化
```

---

## 付録 B: テスト時のモック更新例

### B.1 projectConfigRepository テスト

```typescript
// 変更前
expect(mockVfs.setAdapter).toHaveBeenCalledWith(null, { type: 'github', opts: { ... } })

// 変更後
expect(mockVfs.setAdapter).toHaveBeenCalledWith({ type: 'github', opts: { ... } })
```

### B.2 metadataStore テスト

```typescript
// 変更前
const mockSetAdapter = jest.fn()
mockVfs.setAdapter = mockSetAdapter
// ... 呼び出し後
expect(mockSetAdapter).toHaveBeenCalledWith(null, expect.objectContaining({ type: 'github' }))

// 変更後
expect(mockSetAdapter).toHaveBeenCalledWith(expect.objectContaining({ type: 'github' }))
```

---

## 付録 C: `parseAdapterFromUrl` のプラットフォーム判定ルール

（browser-git-ops ライブラリ内部 `src/virtualfs/utils/urlParser.ts` の仕様）

優先順位:
1. `platformOverride` が `github` / `gitlab` なら採用
2. ホスト名に `gitlab` を含む → `gitlab`
3. ホスト名に `github` を含む → `github`
4. token が `glpat_` で始まる → `gitlab` / `ghp_` で始まる → `github`
5. URL パスのセグメント数 >= 3 → `gitlab`（グループ/サブグループ想定）
6. URL パスのセグメント数 === 2 → `github`
7. 上記いずれにも該当しない → エラー

> `setAdapter(type, url, token?)` 形式で呼ぶ場合、第一引数の `type` が `platformOverride` として渡されるため、ルール 1 により確実にプラットフォームが決定される。
