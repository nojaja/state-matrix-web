# GitHub Pages 自動デプロイメント（概要・設定ガイド）

**目的**: フロントエンドのビルド成果物を自動で GitHub Pages に公開するための GitHub Actions ワークフローを実装しています。

**ワークフロー位置**: `.github/workflows/build-and-deploy.yml`

**主な処理**
- リポジトリのチェックアウト
- Node.js のセットアップ（`22.x`）および `npm` キャッシュの利用
- 依存インストール（`npm ci`）
- `npm run lint`（静的解析）
- `npm run test:ci`（ユニットテスト：CI向け）
- ビルド：`npm run build`（Vite + vue-tsc）
- master への push の場合のみ `./dist` を Pages 用アーティファクトとしてアップロードし、`actions/deploy-pages` でデプロイ

トリガー
- `push` on `master`: ビルド→テスト→デプロイ（公開）
- `pull_request` targeting `master`: ビルド→テスト（デプロイは行わない）

重要なワークフロー設定ポイント
- `permissions` に `pages: write` と `id-token: write` を付与
- `concurrency` を使い、同一 ref のデプロイの同時実行を防止
- ビルドジョブで `actions/upload-pages-artifact@v3` を使い、デプロイジョブで `actions/deploy-pages@v4` を使う
- CI の高速化のため `actions/setup-node` の `cache: 'npm'` を利用

ビルド成果物
- 出力先: `dist/`（`vite build` のデフォルト出力）
- デプロイ対象: `dist/` 配下の静的ファイル一式

リポジトリ設定（手動設定が必要な場合）
1. GitHub のリポジトリ -> `Settings` -> `Pages` に移動
2. Source は通常 `gh-pages` ブランチや `GitHub Actions` による自動設定が利用されますが、本ワークフローは `actions/deploy-pages` を使用するため追加設定は不要です。
3. `Environments` や `Branch protection` など組織ポリシーに合わせて権限を調整してください。

デプロイ先 URL の形式
- 通常: `https://<OWNER>.github.io/<REPO>/`（リポジトリがユーザー/組織ページでない場合）

ローカルでの手動ビルドと確認
```powershell
npm ci ; npm run build
npm run preview
```

※ `npm run preview` は `vite preview` を起動します。別途 `http-server` などで `dist/` を配信したい場合は `npm i http-server` を行い、`node .\node_modules\http-server\bin\http-server dist -p 8080` などで確認できます。

トラブルシューティング
- キャッシュ・依存で問題が発生した場合は Actions のキャッシュをクリアして再実行
- テストが失敗する場合は、`Actions` のログで失敗箇所を確認してローカルで `npm run test:ci` を実行して再現
- デプロイ済みファイルが期待どおりでない場合は `dist/` をローカルで確認し、ビルド設定（`vite.config.ts`）を見直す

- SPA のルーティングについて: GitHub Pages はサーバー側のフォールバックが無いため、直接 `/<repo>/<route>` にアクセスすると 404 になります。
	- 対策: リポジトリに `public/404.html` を用意し、`index.html` をクライアント側で読み込むフォールバックを実装しています。これにより SPA のヒストリールートへ直接アクセスしてもアプリが復元されます。
	- 注意: `vite.config.ts` の `base` 設定と `public/404.html` の `BASE_INDEX` 値（デフォルト `/state-matrix-web/index.html`）が一致していることを確認してください。

補足: カスタマイズ
- Node バージョン、テストコマンド、ビルド出力先を変更したい場合は `.github/workflows/build-and-deploy.yml` を編集してください。

以上
