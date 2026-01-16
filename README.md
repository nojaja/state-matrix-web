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

（設計書に記載の想定構成の抜粋）

```
state-matrix-web/
├── apps/
│   ├── web-frontend/    # Vue 3 SPA
│   └── api-server/      # Node.js (JSON-RPC + WebSocket)
├── packages/            # shared domain / ui kit
├── configs/
└── docs/                # spec/ 等
```

## Technology Stack (設計書より)

- Node.js 22.21.0 (ESM)
- TypeScript (strict)
- Frontend: Vue.js 3 (Composition API) + Pinia + Vue Router
- Build: Webpack 5 / Vite（開発用）
- DB: PostgreSQL
- API: JSON-RPC 2.0 over HTTPS / WebSocket

（詳細は [spec/nonfunctional_requirements.md](spec/nonfunctional_requirements.md) を参照）

## 主な機能（設計）

- 案件（Case）管理: CRUD、Owner/履歴管理
- 型マスタ管理: `CategoryMaster`, `*Types`（Job/Action/Artifact）
- ActionTrigger（IN/OUT）入力とマトリクス編集
- 成果物（Artifact）実績管理
- 因果関係（ActionTrigger ↔ Artifact）の登録とテンプレート適用
- ギャップ分析・未定義型検出、名寄せ（merge）・分割支援
- CSV/JSON エクスポート、分析向けデータ提供

⚠️ 実装状況: 設計書のみ存在し、実装は未着手です。状態遷移図のレンダリング等は設計上「外部ツール連携」を想定しています（specを参照）。

## セットアップ（現状の注意点）

- このリポジトリには `package.json` や実装コードが含まれていないため、依存インストールや実行スクリプトは定義されていません。
- 設計書の非機能要件に沿う開発環境の要件:
	- Node.js `22.21.0`
	- npm `10.x`
	- PostgreSQL（開発用に docker-compose 想定）

例（実装が追加された場合の想定コマンド）:

```powershell
npm install
npm run dev    # フロント: webpack-dev-server / Vite
npm run build
```

⚠️ 実行スクリプトは未定義です。実装追加時に `package.json` を参照してください。

## Usage（設計上の想定）

- Web アプリは開発サーバで動作し、既定で `http://localhost:8080` を想定しています（[spec/ui.setup.instructions.md] 相当）。
- メインのワークフローは `Contributor` が案件と ActionTrigger を入力し、`Analyst` が型マスタの整理とギャップ分析を行う流れです（詳細は [spec/functional_requirements.md](spec/functional_requirements.md)）。

## 技術的メモ / 実装上のポイント

- API は JSON-RPC 2.0 を前提（HTTP POST `/rpc` と WebSocket 経由の両対応）。
- 認証は SSO (OAuth/OIDC) を想定し、JWT 検証と RBAC/ABAC を組み合わせる設計。
- データモデルは `spec/ER.md` に PlantUML 形式で定義されています。DB は PostgreSQL を想定。

## 現在のステータス

- 設計ドキュメント: 完了（`spec/` に要件・非機能要件・ER図・シーケンスあり）
- 実装: なし（実装用のソースコード、`package.json`、スクリプトは未配置）

## 次の推奨アクション

1. リポジトリに `apps/web-frontend` / `apps/api-server` の骨子を追加する。
2. `package.json` と開発用スクリプトを定義する（Node.js 22 ベース）。
3. CI (lint/typecheck/test/build) の初期パイプラインを作る。

## 参照 / 追加資料

- 設計書: [spec/functional_requirements.md](spec/functional_requirements.md)
- 非機能要件: [spec/nonfunctional_requirements.md](spec/nonfunctional_requirements.md)
- データモデル: [spec/ER.md](spec/ER.md)

---
更新: 設計書を基に `README.md` を作成しました。次に実装骨子や `package.json` を追加できます。ご希望あれば作成します。
