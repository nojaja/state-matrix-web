# state-matrix-web

状態整理マトリクス（Action × IN/OUT）を収集・分析するための設計ドキュメント集です。

## Project Overview

- 目的: 複数部署・複数担当者が持つ業務アクションとそのIN/OUTを収集し、状態整理マトリクスを生成・分析するためのWebアプリ（設計）。
- 本リポジトリには仕様書（`spec/`）が含まれており、実装はまだ含まれていません（設計フェーズの成果物が中心）。

## 現状（このリポジトリ）

- ドキュメント: `spec/` フォルダに要件・ER図・シーケンスなどの設計書が格納されています。
- ルートに `LICENSE` と `README.md` が存在します。

参照ファイル:

- [spec/functional_requirements.md](spec/functional_requirements.md)
- [spec/nonfunctional_requirements.md](spec/nonfunctional_requirements.md)
- [spec/ER.md](spec/ER.md)
- [spec/ER_02.md](spec/ER_02.md)
- [spec/user_operation_sequence.puml](spec/user_operation_sequence.puml)

## 推奨プロジェクト構成（設計仕様より）

# state-matrix-web

本リポジトリは「状態整理マトリクス（Action × IN/OUT）」に関するWebアプリケーション実装と設計を含むプロジェクトです。

**現状**: 設計ドキュメント（`spec/`）に加え、Vue 3 ベースのフロントエンド実装（`src/`）とテストの雛形が存在します。以下はコードベースに基づく事実に限定したドキュメントです。

**主要なファイル/ディレクトリ**
- [package.json](package.json) - スクリプトと依存定義
- [src/](src/) - フロントエンド実装（Vue 3 + Pinia + Vue Router）
- [src/App.vue](src/App.vue) - ルートコンポーネント（ページタブ, `router-view`）
- [src/main.ts](src/main.ts) - アプリエントリ（Pinia、Router を登録）
- [src/views/](src/views/) - 各ページビュー（Process/Artifact/Trigger/Category/Role 等）
- [src/stores/](src/stores/) - Pinia ストア（artifactStore 等）
- [test/unit/](test/unit/) - ユニットテスト（Jest）
- [spec/](spec/) - 設計・要件・ER図等のドキュメント

**技術スタック（codebaseより）**
- フレームワーク: `vue` (^3.x)
- 状態管理: `pinia`
- ルーティング: `vue-router`
- ビルド/開発: `vite`（`dev` スクリプトで起動）
- テスト: `jest`（ユニットテスト）
- 言語: TypeScript（`type: "module"` が有効）
- 主要依存: `date-fns`, `js-yaml`, `lucide-vue-next`, `uuid` など（詳細は `package.json`）

## 機能（実装上の確認）
- UI: タブ式のページ構成で以下の画面が用意されています。
  - `プロセス管理`、`作成物管理`、`トリガー管理`、`カテゴリ管理`、`ロール管理`（`src/views/` の各 View）
- ストア: `artifactStore`, `categoryStore`, `processStore`, `triggerStore`（`src/stores/`）
- テスト: `test/unit/` にユニットテストが存在します（Jest 設定は `jest.unit.config.js`）。

⚠️ 注意: 設計ドキュメントにはより広い仕様（APIサーバー、DB設計など）が記載されていますが、本 README の機能記述はリポジトリ内の実装ファイルに基づいています。

## セットアップ
1. 依存をインストール:

```powershell
npm install
```

2. 開発サーバ起動（Vite）:

```powershell
npm run dev
```

3. ビルド（プロダクション）:

```powershell
npm run build
```

4. プレビュー（ビルド確認）:

```powershell
npm run preview
```

5. テスト:

```powershell
npm run test
# CI 用にカバレッジを生成する: npm run test:ci
```

6. 静的解析/リンティング:

```powershell
npm run lint
```

## 開発者向けノート
- `npm run dev` は `vite` を起動します。`vite.config.ts` にサーバポート設定は含まれていないため、Vite の既定値が使用されます。
- ESM (`type: "module"`) と TypeScript を採用しているため、import/export を用いた ESM 構成です。
- ユニットテストは Jest（`jest.unit.config.js`）で動作します。テストは TypeScript のテストファイルを対象としています。

## Project Structure（主要ファイル説明）
- [src/main.ts](src/main.ts): アプリのエントリ。Pinia と Router を登録して `#app` にマウントします。
- [src/App.vue](src/App.vue): ルートレイアウト。タブで主要ページへ遷移し、`<router-view>` で各ページを描画します。
- [src/views/*](src/views/): 各ページコンポーネント（`ArtifactView.vue`, `CategoryView.vue`, `ProcessView.vue`, `RoleView.vue`, `TriggerView.vue`）
- [src/stores/*](src/stores/): Pinia ストア群（各種 CRUD と状態管理の責務）
- [spec/](spec/): 要件・ER図・シーケンス等、設計ドキュメント群

## 既存の設計ドキュメント
- 詳細な要件や ER 図などは [spec/](spec/) にあります。実装と設計を照合しながら進めてください。

## 既知の未実装/拡張候補
- サーバサイド API 実装（JSON-RPC や DB 連携）は現状含まれていません（設計は spec に記載）。 ⚠️
- CI ワークフロー（lint/typecheck/test/build）の一部は未構成の場合があります。プロジェクト要件に合わせて `.github/workflows` 等を追加してください。

---
更新履歴: README をリポジトリ内の実装（`src/`）と `package.json` の内容に合わせて更新しました。

ご希望があれば、次の作業を進めます:
- `apps/web-frontend` の単体化（Vite + Vue の明確なエントリ分離）
- CI 設定（GitHub Actions）と自動テストパイプラインの追加
- API サーバの骨子（Node + TypeScript）作成

---
