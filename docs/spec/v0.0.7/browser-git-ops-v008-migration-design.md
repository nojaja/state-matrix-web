# browser-git-ops v0.0.8 移行 詳細設計書

更新日: 2026-02-26  
バージョン: v0.0.8  
対象ライブラリ: [browser-git-ops v0.0.8](https://github.com/nojaja/browser-git-ops) (main ブランチ, package.json version `0.0.8`)

---

## 1. 概要

### 1.1 目的

- `browser-git-ops` を v0.0.7 → v0.0.8 にアップデートし、破壊的変更に対応する。
- v0.0.8 で追加された `setAdapter(type, url, branch?, token?)` の **branch パラメータ** に対応する（v0.0.7 は `setAdapter(type, url, token?)` で branch は URL クエリパラメータ経由）。
- `AdapterMeta` 型の構造変更（トップレベルに `url`, `branch`, `token` が追加、`opts` から `branch`/`token` が除去）に対応する。
- `getAdapter()` の戻り値形式変更に対応し、`buildRepoConfigFromAdapter` のマッピングロジックを更新する。
- RepoSettingsModal の `setAdapter` 呼び出し方式を v0.0.8 API に統一する。

### 1.2 背景

browser-git-ops は以下の段階的な API 変更を行った:

| バージョン | setAdapter API | AdapterMeta 構造 |
|-----------|---------------|-----------------|
| v0.0.5 | `setAdapter(adapter, meta?)` — 第一引数に adapter or null | `{ type, opts: { owner, repo, token, branch, ... } }` |
| v0.0.6 | `setAdapter(meta)` — adapter 引数廃止 | `{ type, opts: { ... } }` |
| v0.0.7 | `setAdapter(meta)` / `setAdapter(type, url, token?)` / `setAdapter(url)` | `{ type, opts: { ... } }` — opts 内に全情報 |
| **v0.0.8** | `setAdapter(meta)` / **`setAdapter(type, url, branch?, token?)`** / `setAdapter(url, branch?, token?)` | **`{ type, url?, branch?, token?, opts?: AdapterOptions }`** — branch/token がトップレベルに昇格、opts から除去される |

現在の state-matrix-web は v0.0.7 API で動作しているが、以下の問題がある:

1. **RepoSettingsModal.vue** が `setAdapter(provider, urlWithBranch, token)` と 3 引数（v0.0.7 の `type, url, token` 方式）で呼んでおり、branch を URL クエリパラメータ `?branch=xxx` で渡している
2. **metadataStore.ts** は `setAdapter(meta)` で `{ type, opts: { ..., branch, token } }` 形式の AdapterMeta を渡している
3. v0.0.8 では `setAdapter(type, url, branch?, token?)` の引数順序が変わり、**branch が第3引数、token が第4引数** になった
4. v0.0.8 では正規化後の `AdapterMeta` が `{ type, url, branch, token, opts }` 形式となり、`opts` からは `branch`/`token` が除去される

### 1.3 変更スコープ

| カテゴリ | 対象ファイル | 変更内容 |
|----------|------------|----------|
| パッケージ | `package.json` | `browser-git-ops` を `^0.0.8` に更新 |
| 型定義 | `src/shims-browser-git-ops.d.ts` | 新 API シグネチャ・`AdapterMeta` 型の更新 |
| 型定義 | `src/types/models.ts` | `VirtualFsInstance` インターフェース・`RepoConfig` 型を更新 |
| モーダル | `src/components/common/RepoSettingsModal.vue` | `setAdapter(type, url, branch, token)` 方式に変更、URL クエリパラメータ方式を廃止 |
| ストア | `src/stores/metadataStore.ts` | `buildAdapterPayload` / `buildRepoConfigFromAdapter` を新 `AdapterMeta` 形式に対応 |
| リポジトリ | `src/repositories/projectConfigRepository.ts` | ローカル `AdapterMeta` 型定義を更新 |
| テスト | `test/unit/` 配下の関連テスト | モック・呼び出しシグネチャ・期待値を更新 |

---

## 2. browser-git-ops v0.0.7 → v0.0.8 の API 変更まとめ

### 2.1 `setAdapter` シグネチャ変更（破壊的）

#### v0.0.7（旧）

```typescript
// setAdapter のオーバーロード（v0.0.7）
async setAdapter(meta: AdapterMeta): Promise<void>
async setAdapter(type: string, url: string, token?: string): Promise<void>
async setAdapter(url: string): Promise<void>

// 内部実装: arguments[1] = url, arguments[2] = token
async setAdapter(metaOrTypeOrUrl?: AdapterMeta | string) {
  const urlOrUndefined = (arguments as any)[1]
  const tokenOrUndefined = (arguments as any)[2]
  const meta = await this._parseAdapterArgs(metaOrTypeOrUrl, urlOrUndefined, tokenOrUndefined)
  ...
}
```

#### v0.0.8（新）

```typescript
// setAdapter のオーバーロード（v0.0.8）
async setAdapter(meta: AdapterMeta): Promise<void>
async setAdapter(type: string, url: string, branch?: string, token?: string): Promise<void>  // ★ branch が第3引数に追加
async setAdapter(url: string, branch?: string, token?: string): Promise<void>               // ★ URL のみ形式も branch 追加

// 内部実装: arguments[1] = url/branch, arguments[2] = branch/token, arguments[3] = token
async setAdapter(metaOrTypeOrUrl?: AdapterMeta | string) {
  const argument1 = (arguments as any)[1]
  const argument2 = (arguments as any)[2]
  const argument3 = (arguments as any)[3]
  const meta = this._parseAdapterArgs(metaOrTypeOrUrl, argument1, argument2, argument3)
  ...
}
```

**主要な違い:**

| 項目 | v0.0.7 | v0.0.8 |
|------|--------|--------|
| `(type, url, ...)` 形式の引数 | `(type, url, token?)` | `(type, url, branch?, token?)` — **branch が挿入されて token が後ろにずれた** |
| `(url, ...)` 形式の引数 | `(url)` | `(url, branch?, token?)` |
| `_parseAdapterArgs` の戻り値 | `Promise<any>` (async) | `AdapterMeta` (**同期**) |
| branch 指定方法 | URL クエリパラメータ `?branch=xxx` | 引数で直接渡す or `AdapterMeta.branch` |

### 2.2 `AdapterMeta` 型変更（破壊的）

#### v0.0.7

```typescript
interface AdapterMeta {
  type: string
  opts?: Record<string, any>   // branch, token, owner, repo 等すべてが opts 内
}
```

#### v0.0.8

```typescript
// browser-git-ops/src/virtualfs/types.ts (commit 68278d8)
interface AdapterOptionsBase {
  token?: string
  branch?: string
  host?: string
  defaultBranch?: string
  repositoryName?: string
  repositoryId?: string | number
}

interface GitHubAdapterOptions extends AdapterOptionsBase {
  owner: string
  repo: string
}

interface GitLabAdapterOptions extends AdapterOptionsBase {
  projectId: string
}

type AdapterOptions = GitHubAdapterOptions | GitLabAdapterOptions

interface AdapterMeta {
  type: string
  url?: string       // ★ NEW: canonical repository URL
  branch?: string    // ★ NEW: branch at top level (opts から移動)
  token?: string     // ★ NEW: token at top level (opts から移動)
  opts?: AdapterOptions  // ★ CHANGED: typed, branch/token は除去される
}
```

**重要:** v0.0.8 の `setAdapter` 内部では `_normalizeFromMeta` / `_normalizeFromTypeUrl` / `_normalizeFromUrl` が呼ばれ、正規化の過程で以下が行われる:

1. `opts` から `branch`, `token`, `defaultBranch`, `repositoryName`, `repositoryId` が **除去** される（`_stripOptionsFields`）
2. `branch` と `token` は `AdapterMeta` の**トップレベル**に移される
3. `url` は `opts` から `buildUrlFromAdapterOptions` で自動構築される（`url` が未指定の場合）

#### `_normalizeFromMeta` の動作（v0.0.8）

```typescript
// setAdapter({ type: 'github', opts: { owner: 'x', repo: 'y', token: 'tok', branch: 'dev' } })
// ↓ 正規化後
{
  type: 'github',
  url: 'https://github.com/x/y',     // opts から自動構築
  branch: 'dev',                       // opts.branch → トップレベルに移動
  token: 'tok',                        // opts.token → トップレベルに移動
  opts: { owner: 'x', repo: 'y' }     // branch/token が除去された
}
```

### 2.3 `getAdapter()` 戻り値の変更

v0.0.7 と同じく `Promise<any>` を返すが、**永続化された AdapterMeta の形状が変わる**:

```typescript
// v0.0.7 で getAdapter() が返す形式
{ type: 'github', opts: { owner: 'x', repo: 'y', token: 'tok', branch: 'main' } }

// v0.0.8 で getAdapter() が返す形式（setAdapter 経由で保存された場合）
{ type: 'github', url: 'https://github.com/x/y', branch: 'main', token: 'tok', opts: { owner: 'x', repo: 'y' } }
```

> **後方互換:** v0.0.7 以前に保存された IndexFile.adapter は旧形式 `{ type, opts: { owner, repo, token, branch } }` のまま。  
> v0.0.8 の `getAdapter()` はこの形式のデータを**そのまま返す**（`loadIndex` で `(index as any).adapter` を直接 `adapterMeta` に代入するため）。  
> ただし次回 `setAdapter` が呼ばれた時点で新形式に正規化・上書きされる。

### 2.4 `_getPersistedBranch()` 新規ヘルパー

v0.0.8 では内部的に `_getPersistedBranch()` が追加され、branch の取得に一貫性を持たせている:

```typescript
private _getPersistedBranch(): string {
  if (!this.adapterMeta) return 'main'
  return this.adapterMeta.branch || (this.adapterMeta.opts && this.adapterMeta.opts.branch) || 'main'
}
```

→ トップレベル `branch` を優先しつつ、旧形式の `opts.branch` にもフォールバックする。

### 2.5 `_instantiateAdapter` の token マージ

v0.0.8 では adapter インスタンス生成時にトップレベルの `token` を `opts` にマージする:

```typescript
private _instantiateAdapter(type: string, options: any): any | null {
  const optionsWithLogger = { ...(options || {}) } as any
  // ★ v0.0.8: トップレベルの token を opts に注入
  if (this.adapterMeta && this.adapterMeta.token && !optionsWithLogger.token) {
    optionsWithLogger.token = this.adapterMeta.token
  }
  if (this.logger) optionsWithLogger.logger = this.logger
  if (type === 'github') return new GitHubAdapter(optionsWithLogger)
  if (type === 'gitlab') return new GitLabAdapter(optionsWithLogger)
  ...
}
```

### 2.6 `parseAdapterFromUrl` の変更

v0.0.8 では `parseAdapterFromUrl` 自体の API は変わらないが、内部の branch 処理が変更:

```typescript
// v0.0.7: URL クエリパラメータ ?branch=xxx を opts.branch に設定
function buildGithubMeta(..., branchParameter?: string): AdapterMeta {
  const options = { owner, repo, branch: branchParameter || 'main' }
  return { type: 'github', opts: options }
}

// v0.0.8: 同じ（ただし setAdapter 側の _normalizeFromTypeUrl で branch はトップレベルに移される）
```

### 2.7 `buildUrlFromAdapterOptions` 新規ユーティリティ

v0.0.8 で追加された **逆変換関数** — `AdapterOptions` からリポジトリ URL を構築する:

```typescript
export function buildUrlFromAdapterOptions(type: string, options: Record<string, any>): string {
  if (type === 'github') {
    const owner = options.owner || ''
    const repo = options.repo || ''
    if (!owner || !repo) throw new Error('owner and repo are required for github')
    const host = options.host as string | undefined
    if (host) {
      const baseUrl = host.replace(/\/api\/v\d+\/?$/i, '')
      return `${baseUrl}/${owner}/${repo}`
    }
    return `https://github.com/${owner}/${repo}`
  }
  if (type === 'gitlab') {
    const projectId = options.projectId || ''
    if (!projectId) throw new Error('projectId is required for gitlab')
    const host = options.host as string | undefined
    if (host) {
      const trimmed = host.replace(/\/+$/, '')
      return `${trimmed}/${projectId}`
    }
    return `https://gitlab.com/${projectId}`
  }
  throw new Error(`unsupported adapter type: ${type}`)
}
```

### 2.8 tree API ページネーション対応（v0.0.8 追加、commit `a01bda8`）

v0.0.8 では GitHub の Tree API にページネーション対応が追加された。AdapterMeta 型の安全性も強化されている。  
→ state-matrix-web 側では直接の対応は不要（ライブラリ内部の改善）。

---

## 3. 現行コードの `setAdapter` / `getAdapter` 呼び出し箇所一覧

### 3.1 `src/components/common/RepoSettingsModal.vue`

```typescript
// deleteToken() 内 (L144 付近)
const urlWithBranch = buildUrlWithBranch(cfg.repositoryUrl, cfg.branch)
await vfs.setAdapter(cfg.provider, urlWithBranch, cfg.token || undefined)
// ↑ v0.0.7 の (type, url, token?) 方式。v0.0.8 では (type, url, branch?, token?) に変更必要

// onSave() 内 (L166 付近)
const urlWithBranch = buildUrlWithBranch(cfg.repositoryUrl, cfg.branch)
await vfs.setAdapter(cfg.provider, urlWithBranch, cfg.token || undefined)
// ↑ 同上
```

**現行の問題:** `buildUrlWithBranch()` で branch を URL クエリパラメータ `?branch=xxx` として付与しているが、v0.0.8 では branch は独立した引数として渡すべき。

### 3.2 `src/stores/metadataStore.ts`

```typescript
// setAdapterWithFallback() (L268-L271)
await vfs.setAdapter(payload)  // payload = { type, opts: { owner, repo, token, branch } }
// ↑ v0.0.7 の setAdapter(meta) 方式

// setAdapterViaOpenProject() (L181)
await tmpVfs.setAdapter(adapterPayload)  // 同上

// saveRepoConfig() (L596)
await currentVfs.setAdapter(adapterPayload)  // 同上

// ensureAdapterOnVfs() (L283)
await setAdapterWithFallback(vfs, adapterPayload)  // 同上
```

### 3.3 `src/repositories/projectConfigRepository.ts`

```typescript
// setAdapter() (L29)
await vfs.setAdapter(input)  // input = { type, opts: { ... } }
// ↑ v0.0.7 の setAdapter(meta) 方式
```

### 3.4 `getAdapter()` の利用箇所

```typescript
// projectConfigRepository.ts (L16)
return vfs.getAdapter()  // 戻り値: { type, opts: { ... } } (v0.0.7 形式)

// metadataStore.ts のloadRepoConfig 内 (L553 付近)
const adapter = await getAdapterWithFallback(project, vfs, openedHere)
// → vfs.getAdapter() を呼び、結果を buildRepoConfigFromAdapter() に渡す
```

---

## 4. 移行方針

### 4.1 `setAdapter` 呼び出しの方針

| 呼び出し元 | 現行方式 | 新方式 (v0.0.8) | 理由 |
|-----------|---------|----------------|------|
| **RepoSettingsModal.vue** | `setAdapter(provider, urlWithBranch, token)` — 3引数 + URL クエリ | `setAdapter(provider, url, branch, token)` — **4引数方式** | ユーザー要件で `setAdapter(type, url, token?)` 方式を採用（v0.0.8 では `setAdapter(type, url, branch?, token?)` に拡張）。URL クエリパラメータ方式は廃止。 |
| **metadataStore.ts** | `setAdapter(meta)` — AdapterMeta 方式 | `setAdapter(meta)` — **そのまま** | 内部処理は AdapterMeta 方式を維持。ただし `buildAdapterPayload` の出力を新形式 `{ type, url?, branch?, token?, opts? }` に変更 |
| **projectConfigRepository.ts** | `setAdapter(input)` — AdapterMeta 方式 | `setAdapter(input)` — **そのまま** | 引数の型定義を更新するのみ |

### 4.2 `AdapterMeta` 更新方針

v0.0.8 では `setAdapter(meta)` に渡す `meta` が内部で正規化されるため、**旧形式 `{ type, opts: { owner, repo, token, branch } }` を渡しても動作する。** 内部の `_normalizeFromMeta` が以下を行うため:

1. `opts.branch` → トップレベル `branch` に移動
2. `opts.token` → トップレベル `token` に移動
3. `opts` から `buildUrlFromAdapterOptions` で `url` を自動構築

ただし、**明示的に新形式を使う方が可読性・保守性が高い**ため、`buildAdapterPayload` の出力を新形式に変更する。

### 4.3 `getAdapter()` 戻り値のハンドリング方針

`getAdapter()` が返す `AdapterMeta` は以下の 2 パターンがある:

1. **v0.0.8 で保存されたデータ:** `{ type, url, branch, token, opts: { owner, repo } }` — 新形式
2. **v0.0.7 以前に保存されたデータ:** `{ type, opts: { owner, repo, token, branch } }` — 旧形式

`buildRepoConfigFromAdapter` を**両方の形式に対応**させる必要がある。

---

## 5. 各ファイルの具体的変更内容

### 5.1 `package.json`

```diff
-    "browser-git-ops": "^0.0.7",
+    "browser-git-ops": "^0.0.8",
```

### 5.2 `src/shims-browser-git-ops.d.ts`

```typescript
declare module 'browser-git-ops' {
  /** アダプターオプション基底 */
  export interface AdapterOptionsBase {
    token?: string
    branch?: string
    host?: string
    defaultBranch?: string
    repositoryName?: string
    repositoryId?: string | number
  }

  /** GitHub アダプターオプション */
  export interface GitHubAdapterOptions extends AdapterOptionsBase {
    owner: string
    repo: string
  }

  /** GitLab アダプターオプション */
  export interface GitLabAdapterOptions extends AdapterOptionsBase {
    projectId: string
  }

  /** 統合アダプターオプション型 */
  export type AdapterOptions = GitHubAdapterOptions | GitLabAdapterOptions

  /** アダプターメタデータ（v0.0.8 形式） */
  export interface AdapterMeta {
    type: string
    url?: string
    branch?: string
    token?: string
    opts?: AdapterOptions
  }

  export interface StorageBackend {}

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

    // Adapter management (v0.0.8)
    setAdapter(meta: AdapterMeta): Promise<void>
    setAdapter(type: string, url: string, branch?: string, token?: string): Promise<void>
    setAdapter(url: string, branch?: string, token?: string): Promise<void>
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

### 5.3 `src/types/models.ts` — VirtualFsInstance

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
  // v0.0.8: setAdapter は meta オブジェクト or (type, url, branch?, token?) のオーバーロード
  setAdapter?(...args: any[]): Promise<void>;
  // v0.0.8: getAdapter は新形式 { type, url?, branch?, token?, opts? } を返す
  getAdapter?(): Promise<{ type: string; url?: string; branch?: string; token?: string; opts?: Record<string, unknown> } | null>;
  getAdapterInstance?(): Promise<any | null>;
  getAdapterMeta?(): { type: string; url?: string; branch?: string; token?: string; opts?: Record<string, unknown> } | null;
  // Conflict API
  getConflicts?(): Promise<ConflictTriple[]>;
  resolveConflict?: Function;
}
```

### 5.4 `src/types/models.ts` — RepoConfig

`RepoConfig` 型自体は変更不要。現行の形式で v0.0.8 API に対応可能:

```typescript
// 変更なし
export type RepoConfig = {
  provider: 'github' | 'gitlab'
  repositoryUrl: string       // リポジトリ URL
  branch: string              // ブランチ名
  token?: string              // Personal Access Token
  lastSyncedCommitSha?: string | null
}
```

### 5.5 `src/components/common/RepoSettingsModal.vue`

主な変更:

1. `buildUrlWithBranch()` 関数を**廃止**: branch は URL クエリパラメータではなく独立した引数で渡す
2. `setAdapter(provider, urlWithBranch, token)` → `setAdapter(provider, url, branch, token)` に変更（**4引数方式**）

```typescript
// 変更前 (v0.0.7)
const urlWithBranch = buildUrlWithBranch(cfg.repositoryUrl, cfg.branch)
await vfs.setAdapter(cfg.provider, urlWithBranch, cfg.token || undefined)

// 変更後 (v0.0.8)
await vfs.setAdapter(cfg.provider, cfg.repositoryUrl, cfg.branch || 'main', cfg.token || undefined)
```

### 5.6 `src/stores/metadataStore.ts`

#### 5.6.1 `buildAdapterPayload()` の変更

旧形式 `{ type, opts: { owner, repo, token, branch } }` を新形式に変更:

```typescript
// 変更後 (v0.0.8)
function buildAdapterPayload(cfg: RepoConfig): any {
  const { segments, origin } = parseRepoUrl(cfg.repositoryUrl || '')
  const type = cfg.provider === 'gitlab' ? 'gitlab' : 'github'

  // v0.0.8: branch/token はトップレベル、opts には host/owner/repo 等のみ
  if (type === 'gitlab') {
    const projectId = segments.join('/')
    const opts: Record<string, any> = { projectId }
    if (origin && origin !== 'https://gitlab.com') opts.host = origin
    return { type, url: cfg.repositoryUrl, branch: cfg.branch || 'main', token: cfg.token, opts }
  }
  const owner = segments[0] || ''
  const repo = segments[1] || ''
  const opts: Record<string, any> = { owner, repo }
  if (origin && origin !== 'https://github.com') opts.host = `${origin}/api/v3`
  return { type, url: cfg.repositoryUrl, branch: cfg.branch || 'main', token: cfg.token, opts }
}
```

#### 5.6.2 `buildRepoConfigFromAdapter()` の変更

v0.0.8 の新形式と旧形式の両方に対応:

```typescript
// 変更後 (v0.0.8)
function buildRepoConfigFromAdapter(adapter: any): RepoConfig {
  const opts = (adapter.opts || {}) as Record<string, any>

  // v0.0.8 新形式: adapter.url がトップレベルにある場合
  let url = adapter.url || ''
  if (!url) {
    // 旧形式からの変換フォールバック
    url = buildUrlFromAdapterOpts(adapter.type, opts)
  }

  // v0.0.8: branch/token はトップレベル優先、旧形式の opts からフォールバック
  const branch = adapter.branch || opts.branch || 'main'
  const token = adapter.token || opts.token || undefined

  return {
    provider: adapter.type === 'gitlab' ? 'gitlab' : 'github',
    repositoryUrl: url,
    branch,
    token,
    lastSyncedCommitSha: null
  }
}
```

#### 5.6.3 `setAdapterWithFallback()` — 変更不要

```typescript
// 変更不要: setAdapter(meta) は v0.0.8 でも動作する
async function setAdapterWithFallback(vfs: any, payload: any): Promise<void> {
  await vfs.setAdapter(payload)
}
```

### 5.7 `src/repositories/projectConfigRepository.ts`

ローカルの `AdapterMeta` 型定義を更新:

```typescript
// 変更前
type AdapterMeta = { type: string; opts?: Record<string, unknown> };

// 変更後 (v0.0.8)
type AdapterMeta = {
  type: string;
  url?: string;
  branch?: string;
  token?: string;
  opts?: Record<string, unknown>;
};
```

`setAdapter(input)` / `getAdapter()` の呼び出し自体は変更不要。

---

## 6. データ移行・後方互換性

### 6.1 既存 IndexFile 上のアダプタメタデータ

既存プロジェクトの IndexFile には v0.0.7 形式でアダプタメタが保存されている:

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

v0.0.8 の `getAdapter()` はこの形式のデータをそのまま返す。  
→ `buildRepoConfigFromAdapter()` が新旧両形式に対応するため、**既存データの手動移行は不要**。

次回 `setAdapter(meta)` が呼ばれた時点で v0.0.8 の `_normalizeFromMeta` により自動的に新形式に正規化される:

```json
{
  "adapter": {
    "type": "github",
    "url": "https://github.com/xxx/yyy",
    "branch": "main",
    "token": "ghp_...",
    "opts": {
      "owner": "xxx",
      "repo": "yyy"
    }
  }
}
```

### 6.2 RepoConfig 形式のマイグレーション

`RepoConfig` 型は変更なし。`metadataStore.repoConfigs` はインメモリのみ。  
→ **マイグレーション不要。**

---

## 7. 確認ポイントとリスク

### 7.1 破壊的変更による互換性問題

| # | 確認ポイント | 対策 |
|---|------------|------|
| 1 | v0.0.7 の `setAdapter(type, url, token)` が v0.0.8 でどう解釈されるか | v0.0.8 では第3引数が **branch** として解釈される。`setAdapter('github', 'https://...', 'ghp_xxx')` と呼ぶと `branch='ghp_xxx'` になってしまう。**全箇所の書き換えが必須。** |
| 2 | v0.0.7 の `setAdapter(meta)` で `{ type, opts: { owner, repo, token, branch } }` を渡した場合 | v0.0.8 の `_normalizeFromMeta` が自動変換するため**動作する**。しかし `opts.token`/`opts.branch` がトップレベルに移動・除去される。 |
| 3 | `getAdapter()` の戻り値が変わるか | v0.0.8 で `setAdapter` 経由で保存されたデータは新形式。v0.0.7 以前に保存されたデータは旧形式のまま。`buildRepoConfigFromAdapter` が両形式に対応する必要がある。 |
| 4 | `setAdapter(meta)` で新形式 `{ type, url, branch, token, opts }` を渡した場合 | `_normalizeFromMeta` がそのまま処理する。`url` が既にあるので `buildUrlFromAdapterOptions` は呼ばれない。正常動作。 |
| 5 | `setAdapter(type, url, branch, token)` で branch を省略した場合 | `branch` が `undefined` になり、内部で `'main'` がデフォルトセットされる。問題なし。 |

### 7.2 v0.0.7 → v0.0.8 の引数順序変更の影響

**これが最も重大な破壊的変更:**

```typescript
// v0.0.7: setAdapter(type, url, token?)
await vfs.setAdapter('github', 'https://github.com/o/r', 'ghp_xxx')
// → 正常: type='github', url='https://...', token='ghp_xxx'

// v0.0.8: setAdapter(type, url, branch?, token?)
await vfs.setAdapter('github', 'https://github.com/o/r', 'ghp_xxx')
// → 誤動作: type='github', url='https://...', branch='ghp_xxx', token=undefined
// ↑ token が branch として解釈される！
```

**対象箇所:**

| ファイル | 現行の呼び出し | 問題 | 修正後 |
|---------|-------------|------|-------|
| `RepoSettingsModal.vue` `deleteToken()` | `setAdapter(provider, urlWithBranch, token)` | token が branch に誤解釈 | `setAdapter(provider, url, branch, token)` |
| `RepoSettingsModal.vue` `onSave()` | `setAdapter(provider, urlWithBranch, token)` | 同上 | `setAdapter(provider, url, branch, token)` |

### 7.3 URL クエリパラメータ `?branch=xxx` の扱い

v0.0.8 の `parseAdapterFromUrl` は引き続き URL クエリパラメータ `?branch=xxx` を認識するが、**`setAdapter(type, url, branch?, token?)` の `branch` 引数が優先される**（`_normalizeFromTypeUrl` が `branch || 'main'` を使用するため）。

→ `buildUrlWithBranch()` を廃止し、URL からブランチクエリを除去する方が安全。

### 7.4 UI 変更に伴うリスク

| # | リスク | 対策 |
|---|------|------|
| 1 | `buildUrlWithBranch()` の廃止後、既存の保存データに `?branch=xxx` 付き URL がある可能性 | `buildRepoConfigFromAdapter()` での URL 読み込み時に `?branch=xxx` がある場合は除去する処理を追加検討（ただし v0.0.8 の `parseAdapterFromUrl` が自動処理するため優先度低） |
| 2 | RepoSettingsModal で branch フィールドが空の場合 | `branch || 'main'` のデフォルト処理で対応 |

### 7.5 テスト影響

| テストファイル | 影響 | 修正内容 |
|-------------|------|---------|
| `test/unit/behavior/v0.0.7/virtualfs/projectConfigRepository.test.ts` | 影響あり | `AdapterMeta` 型定義の更新。テストの assertion で新形式の meta を期待するように変更 |
| `test/unit/behavior/v0.0.7/stores/metadataStore.setAdapter.test.ts` | 影響あり | `saveRepoConfig` のテストで `setAdapter` に渡される payload の形式が新形式 `{ type, url, branch, token, opts }` になることを検証 |
| `test/unit/behavior/v0.0.7/stores/metadataStore.repoConfig.test.ts` | 影響あり | 同上 |
| `test/unit/coverage/stores/metadataStore.coverage.test.ts` | 影響軽微 | `setAdapter` が呼ばれることの検証のみ。引数形式チェックなし |
| `test/unit/coverage/stores/metadataStore.sync.coverage.test.ts` | 影響軽微 | 同上 |
| `test/unit/components/RepoSettingsModal.test.ts` | 影響あり（存在する場合） | `setAdapter` 4引数呼び出しの検証に変更 |

---

## 8. 設計上の決定事項

| # | 決定事項 | 理由 |
|---|---------|------|
| 1 | RepoSettingsModal は `setAdapter(type, url, branch, token)` の **4引数方式** を採用 | v0.0.8 API に合致。URL にブランチクエリパラメータを含める方式は廃止 |
| 2 | metadataStore / projectConfigRepository 内部は `setAdapter(meta)` 方式を継続 | `buildAdapterPayload()` 経由で新形式の `AdapterMeta` を構築して渡す。`getAdapter()` の結果をそのまま `setAdapter` に渡せるため保守性が高い |
| 3 | `buildAdapterPayload()` の出力を新形式 `{ type, url, branch, token, opts }` に変更 | v0.0.8 の正規化ロジックとの整合性。将来的に `getAdapter()` → `setAdapter()` のラウンドトリップが正確になる |
| 4 | `buildRepoConfigFromAdapter()` は v0.0.7 旧形式と v0.0.8 新形式の**両方に対応** | 既存の IndexFile に保存された旧形式データとの後方互換性を維持 |
| 5 | `buildUrlWithBranch()` 関数を RepoSettingsModal から**廃止** | v0.0.8 では branch は独立した引数のため不要 |
| 6 | token は URL クエリに含めない | セキュリティ上のリスク回避（v0.0.7 設計書から継続） |
| 7 | branch フィールドは独立入力として継続 | 引数での明示的指定の方が UX 上有利（v0.0.7 設計書から継続） |
| 8 | `RepoConfig` 型は変更しない | 現行の `{ provider, repositoryUrl, branch, token }` で v0.0.8 API に十分対応可能 |

---

## 9. 実装手順

### フェーズ 1: パッケージ更新と型定義修正

1. `package.json` で `browser-git-ops` を `^0.0.8` に更新
2. `npm install` 実行
3. `src/shims-browser-git-ops.d.ts` を v0.0.8 の新 API（`AdapterMeta` 型、`setAdapter` オーバーロード）に合わせて更新
4. `src/types/models.ts` の `VirtualFsInstance` インターフェースを更新（`getAdapter` 戻り値型の `url`, `branch`, `token` 追加）

### フェーズ 2: 内部 API 呼び出しの修正

5. `src/repositories/projectConfigRepository.ts` のローカル `AdapterMeta` 型を更新
6. `src/stores/metadataStore.ts` の変更:
   - `buildAdapterPayload()` を新形式 `{ type, url, branch, token, opts }` に修正
   - `buildRepoConfigFromAdapter()` を新旧両形式対応に修正
   - `setAdapterWithFallback()` は変更不要（`setAdapter(meta)` 方式は v0.0.8 でも動作）

### フェーズ 3: RepoSettingsModal UI 変更

7. `buildUrlWithBranch()` 関数を削除
8. `deleteToken()` / `onSave()` の `setAdapter` 呼び出しを 4 引数方式 `setAdapter(provider, url, branch, token)` に変更

### フェーズ 4: テスト修正と検証

9. 既存ユニットテストの `AdapterMeta` 型定義を更新
10. `buildAdapterPayload` が新形式を返すことに合わせてテストの assertion を更新
11. RepoSettingsModal のテストを 4 引数方式に合わせて更新
12. 全テスト実行して GREEN を確認

---

## 10. `setAdapter` 呼び出し方式の最終設計

### 10.1 RepoSettingsModal → VFS（直接呼び出し）

```typescript
// v0.0.8: setAdapter(type, url, branch?, token?) — 4引数方式
async function onSave() {
  const p = projectStore.selectedProject
  if (!p) return

  // metadataStore 経由で保存（内部で setAdapter(meta) を使用）
  await metadataStore.saveRepoConfig(p, { ...cfg })

  // VFS にも直接反映（defensive）
  const vfs = tryGetCurrentVfs()
  if (vfs && typeof vfs.setAdapter === 'function') {
    await vfs.setAdapter(cfg.provider, cfg.repositoryUrl, cfg.branch || 'main', cfg.token || undefined)
  }
}
```

### 10.2 metadataStore → VFS（AdapterMeta 方式）

```typescript
// metadataStore 内部: 新形式の AdapterMeta を構築して渡す
const payload = buildAdapterPayload(cfg)
// payload = { type: 'github', url: 'https://github.com/o/r', branch: 'main', token: 'tok', opts: { owner: 'o', repo: 'r' } }
await vfs.setAdapter(payload)  // v0.0.8 の _normalizeFromMeta が処理
```

### 10.3 projectConfigRepository → VFS

```typescript
// 変更不要
async setAdapter(input: AdapterMeta): Promise<void> {
  const vfs = this.manager.getCurrentVfs() as VirtualFsInstance | null
  await vfs.setAdapter(input)
}
```

---

## 付録 A: browser-git-ops v0.0.7 → v0.0.8 コミット一覧

| 日付 | コミット | 概要 |
|------|---------|------|
| 2026-02-24 | `a01bda8` | `feat: tree APIページネーション対応およびAdapterMeta型安全性の強化` |
| 2026-02-25 | `68278d8` | `feat: setAdapter APIにbranchパラメータを追加し正規化を統一` |
| 2026-02-25 | `2d09878` | `docs: setAdapter branch設計変更に合わせてREADMEを更新` |

### A.1 `68278d8` の主要変更

- `src/virtualfs/virtualfs.ts`:
  - `setAdapter` 内部で `argument1` 〜 `argument3` の 4引数対応
  - `_parseAdapterArgs` が async → **同期** に変更
  - `_normalizeFromMeta`, `_normalizeFromTypeUrl`, `_normalizeFromUrl`, `_stripOptionsFields` 新規追加
  - `_getPersistedBranch()` 新規追加
  - `_instantiateAdapter` の token マージ追加
- `src/virtualfs/types.ts`:
  - `AdapterOptionsBase`, `GitHubAdapterOptions`, `GitLabAdapterOptions`, `AdapterOptions` 新規追加
  - `AdapterMeta` に `url`, `branch`, `token` フィールド追加
- `src/virtualfs/utils/urlParser.ts`:
  - `buildUrlFromAdapterOptions()` 新規エクスポート関数追加

### A.2 `a01bda8` の主要変更

- GitHub Adapter の Tree API にページネーション対応追加
- `AdapterMeta` 型安全性の強化（型定義の整理）

---

## 付録 B: テスト時のモック更新例

### B.1 projectConfigRepository テスト

```typescript
// 変更前 (v0.0.7)
type AdapterMeta = { type: string; opts?: Record<string, unknown> };
const input: AdapterMeta = {
  type: 'github',
  opts: { owner: 'owner', repo: 'repo', token: 'token', branch: 'main' }
};
expect(vfs.setAdapter).toHaveBeenCalledWith(input);

// 変更後 (v0.0.8) — AdapterMeta 型定義の拡張
type AdapterMeta = {
  type: string;
  url?: string;
  branch?: string;
  token?: string;
  opts?: Record<string, unknown>;
};
const input: AdapterMeta = {
  type: 'github',
  url: 'https://github.com/owner/repo',
  branch: 'main',
  token: 'token',
  opts: { owner: 'owner', repo: 'repo' }
};
expect(vfs.setAdapter).toHaveBeenCalledWith(input);
```

### B.2 metadataStore saveRepoConfig テスト

```typescript
// 変更前 (v0.0.7)
expect(setAdapter).toHaveBeenCalledWith(
  expect.objectContaining({ type: 'github' })
)

// 変更後 (v0.0.8) — 新形式の meta を検証
expect(setAdapter).toHaveBeenCalledWith(
  expect.objectContaining({
    type: 'github',
    url: expect.stringContaining('github.com'),
    branch: 'main',
    token: 'ghp_xxx'
  })
)
```

### B.3 RepoSettingsModal テスト（存在する場合）

```typescript
// 変更前 (v0.0.7): 3引数
expect(mockSetAdapter).toHaveBeenCalledWith('github', 'https://github.com/o/r?branch=main', 'ghp_xxx')

// 変更後 (v0.0.8): 4引数
expect(mockSetAdapter).toHaveBeenCalledWith('github', 'https://github.com/o/r', 'main', 'ghp_xxx')
```

---

## 付録 C: v0.0.8 `setAdapter` 内部実装フロー

```
setAdapter(arg1, arg2?, arg3?, arg4?)
  │
  ├─ arg1 がオブジェクト → _normalizeFromMeta(meta)
  │   ├─ opts から branch/token を抽出してトップレベルに移動
  │   ├─ url が未指定なら buildUrlFromAdapterOptions で自動構築
  │   └─ _stripOptionsFields で opts から branch/token/defaultBranch 等を除去
  │       └─ { type, url, branch, token, opts } を返す
  │
  ├─ arg1 が文字列 かつ arg2 が URL (http...) → _normalizeFromTypeUrl(type, url, branch?, token?)
  │   ├─ parseAdapterFromUrl(url, token, type) で opts を構築
  │   ├─ _stripOptionsFields で opts をクリーン化
  │   └─ { type, url, branch: branch || 'main', token, opts } を返す
  │
  └─ arg1 が文字列 かつ arg2 が URL でない → _normalizeFromUrl(url, branch?, token?)
      ├─ parseAdapterFromUrl(url, token) で type/opts を自動判定
      ├─ _stripOptionsFields で opts をクリーン化
      └─ { type, url, branch: branch || 'main', token, opts } を返す

→ 正規化された AdapterMeta を adapterMeta にキャッシュ
→ _tryPersistAdapterMeta() で IndexFile に永続化
```

**引数の振り分けロジック（`_parseAdapterArgs`）:**

```typescript
const isTypeUrlForm = typeof argument1 === 'string' && /^https?:\/\//i.test(argument1)
// argument1 が http:// or https:// で始まる → (type, url, branch?, token?) 形式
// argument1 が http/https で始まらない → (url, branch?, token?) 形式（arg1 自体が URL）
```

---

## 付録 D: `parseAdapterFromUrl` のプラットフォーム判定ルール（v0.0.8）

v0.0.7 から変更なし:

1. `platformOverride` が `github` / `gitlab` なら採用
2. ホスト名に `gitlab` を含む → `gitlab`
3. ホスト名に `github` を含む → `github`
4. token が `glpat_` で始まる → `gitlab` / `ghp_` で始まる → `github`
5. URL パスのセグメント数 >= 3 → `gitlab`（グループ/サブグループ想定）
6. URL パスのセグメント数 === 2 → `github`
7. 上記いずれにも該当しない → エラー

---

## 付録 E: v0.0.8 `AdapterMeta` 正規化の具体例

### E.1 `setAdapter(meta)` — 旧形式 meta の自動変換

```typescript
// 入力 (v0.0.7 形式)
await vfs.setAdapter({
  type: 'github',
  opts: { owner: 'nojaja', repo: 'browser-git-ops', token: 'ghp_xxx', branch: 'dev' }
})

// 正規化後の adapterMeta (IndexFile に保存される)
{
  type: 'github',
  url: 'https://github.com/nojaja/browser-git-ops',  // buildUrlFromAdapterOptions で自動構築
  branch: 'dev',                                        // opts.branch → トップレベル
  token: 'ghp_xxx',                                     // opts.token → トップレベル
  opts: { owner: 'nojaja', repo: 'browser-git-ops' }   // branch/token 除去済
}
```

### E.2 `setAdapter(type, url, branch, token)` — 4引数方式

```typescript
// 入力
await vfs.setAdapter('github', 'https://github.com/nojaja/browser-git-ops', 'dev', 'ghp_xxx')

// 正規化後
{
  type: 'github',
  url: 'https://github.com/nojaja/browser-git-ops',
  branch: 'dev',
  token: 'ghp_xxx',
  opts: { owner: 'nojaja', repo: 'browser-git-ops' }  // parseAdapterFromUrl + _stripOptionsFields
}
```

### E.3 `setAdapter(meta)` — 新形式 meta

```typescript
// 入力 (v0.0.8 形式)
await vfs.setAdapter({
  type: 'github',
  url: 'https://github.com/nojaja/browser-git-ops',
  branch: 'dev',
  token: 'ghp_xxx',
  opts: { owner: 'nojaja', repo: 'browser-git-ops' }
})

// 正規化後（そのまま）
{
  type: 'github',
  url: 'https://github.com/nojaja/browser-git-ops',
  branch: 'dev',
  token: 'ghp_xxx',
  opts: { owner: 'nojaja', repo: 'browser-git-ops' }
}
```

### E.4 `getAdapter()` で旧データを読み込んだ場合

```typescript
// IndexFile に旧形式のデータが保存されている
// { "adapter": { "type": "github", "opts": { "owner": "x", "repo": "y", "token": "tok", "branch": "main" } } }

const meta = await vfs.getAdapter()
// → { type: 'github', opts: { owner: 'x', repo: 'y', token: 'tok', branch: 'main' } }
// トップレベルの url, branch, token は undefined

// buildRepoConfigFromAdapter が旧形式にフォールバック
buildRepoConfigFromAdapter(meta)
// → { provider: 'github', repositoryUrl: 'https://github.com/x/y', branch: 'main', token: 'tok' }
```
