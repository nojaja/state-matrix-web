# Node.js Web アプリ非機能要件定義書

- 作成日: 2025-11-21
- 対象システム: state-matrix-web
- 参照資料: `spec/functional_requirements.md`, `spec/ER.md`

## 1. 目的と範囲
- state-matrix-web を Node.js 22 + TypeScript + Vue.js スタックで開発・運用する際の品質属性と制約を定義する。
- フロントエンド SPA、バックエンド API/WebSocket、PostgreSQL、SSO、docker-compose、CI/CD を含む。

## 2. システムコンテキスト
- クライアント: Vue.js 3 (Composition API) + TypeScript による SPA。ES Modules 構成。
- サーバ: Node.js 22.21.0 (ESM) 上の REST API + WebSocket Gateway。
- 認証: OAuth/OIDC (hydra または GitLab)。JWT 署名を検証して RBAC/ABAC を適用。
- データ: 状態整理マトリクス関連データを PostgreSQL で永続化。
- インフラ: 開発/検証は docker-compose、本番は Kubernetes 等を想定。

## 3. 技術スタックと制約
- 言語: TypeScript (strict)。クライアント/サーバ共通型を `src/shared` に配置。
- ランタイム: Node.js 22.21.0。CommonJS 非許容、ESM のみ。
- ビルド: Webpack 5.99.8 (本番) + Vite dev server。libraryTarget は `umd`。`npm run build` が docs/ を生成。
- フロント: Vue.js 3 SFC、Pinia ストア、Vue Router。SSR 不要。
- パッケージ管理: npm 10.8.2。`npx` 利用可 (例: `npx prisma migrate`)。package-lock.json 必須。
- ログ: pino など JSON logger。CLI 以外で `log4js` を使わない。

## 4. パフォーマンス要件
- 初回ロード (main bundle + critical CSS) 1.5 MB 未満、TTFB 300ms 以内。
- ActionTrigger マトリクス (100x20) を 2 秒以内で描画。再フィルタは 1 秒以内。
- 分析 API: 95 パーセンタイル 1 秒以内、最大 3 秒。
- WebSocket push: 500ms 以内にクライアントへ到達。
- DB: Case 詳細 API は 1 ラウンドトリップ。N+1 クエリ禁止。

## 5. 可用性・信頼性
- SLA: 平日 09:00-20:00 で 99.5% 稼働。
- HA: Node.js コンテナは 2 系統以上、PostgreSQL は Primary/Replica。
- リトライ: クライアントは 429/5xx に指数バックオフ ×3。サーバは冪等処理のみ自動リトライ。
- バックアップ: PostgreSQL スナップショット 6 時間間隔、30 日保管。暗号化転送。

## 6. セキュリティ要件
- SSO: hydra/GitLab を切替可能。JWKS をキャッシュ、署名検証必須。
- JWT: HTTP-only Secure Cookie または Authorization ヘッダ運用。WebSocket 接続時にも検証。
- 認可: RBAC (Contributor/Analyst/Admin) + 案件単位 ABAC。
- 通信: TLS1.2+、WebSocket も WSS。
- 入力検証: UUID, path, filename は `safeJoin` 等でサニタイズ。
- 依存性: `npm audit --production` を CI で実行し、High 以上はデプロイブロック。

## 7. スケーラビリティ
- サーバは stateless。セッション情報は JWT/Redis。
- docker-compose: `frontend`, `api`, `ws`, `postgres`, `redis`, `hydra`, `gitlab`(stub) を含める。
- Kubernetes: HPA による水平スケール。WebSocket は sticky session または session affinity。
- WebSocket: Redis Pub/Sub 等を用いて複数インスタンスにブロードキャスト。

## 8. 運用・監視
- メトリクス: API レイテンシ、WebSocket 接続数、エラーレート、DB 接続数、キュー長、Compose ヘルス。
- アラート: API 95p >1s、エラーレート >2%、WebSocket 断率 >5%、DB 接続 >80%、ビルド失敗。
- ヘルスチェック: `/healthz` (軽量) と `/readyz` (DB/Redis/SSO 接続) を実装。

## 9. ログとトレーサビリティ
- ログ: JSON (timestamp, level, traceId, spanId, userId, authProvider, result)。
- トレーシング: OpenTelemetry + W3C Trace Context を HTTP/WebSocket 双方で伝播。
- 監査: `*Types`, `Case*`, 名寄せ, 分割操作の CRUD を記録し、差分と参照影響を保持。

## 10. 保守性・拡張性
- Lint/Format: ESLint (typescript-eslint) + Prettier + stylelint。
- モジュール構成: `src/client`, `src/server`, `src/shared`。shared に DTO/型/utility。
- DI: tsyringe などで依存を注入し、SSO/DB/Queue を差し替え可能に。
- 設定: `config/base.yaml` + env 別 yaml + env var。docker-compose では `.env` を mount。

## 11. 開発プロセス
- ブランチ: trunk-based + 短期 feature branch。
- CI ゲート: lint -> type-check (`tsc --noEmit`) -> unit -> e2e -> build。
- ドキュメント: 仕様変更時に `spec/*.md` を更新し、PR に含める。

## 12. テスト要件
- 単体: Jest + ts-jest。`npm run test` は `test/unit/**/*.test.ts`、カバレッジ 80% 以上。
- UI: Playwright (reporter [['html', { open: 'never' }]]).
- API/E2E: supertest 等。WebSocket は ws で統合試験。
- パフォーマンス: k6 で主要 API 500 RPS、WebSocket 1000 同時接続を検証。
- セキュリティ: OWASP ZAP + Snyk。SSO フォールバックもテスト。

## 13. デプロイ / リリース
- CI: GitHub Actions。`npm ci` -> lint -> type-check -> unit -> e2e -> build -> docker image push。
- CD: main merge で staging へ自動デプロイ、承認後 production。
- フロント配信: CDN + immutable assets。Vue の dynamic import / prefetch を活用。
- ロールバック: 直近 3 バージョンの Docker image と DB スナップショットを保持し、即時切り戻し。

## 14. データ管理
- タイムスタンプ: UTC ISO8601。表示時にユーザー timezone へ変換。
- ID: UUID v4。PostgreSQL は `uuid-ossp`。クライアント生成禁止。
- バージョン: `Case*` / `*Types` に version フィールド。楽観ロックを実装。
- マイグレーション: Prisma/Knex で forward-only。`npx prisma migrate deploy` 等で実行。
- マスタ名寄せ: トランザクション内で完結し、参照更新と監査ログをアトミックに記録。

## 15. 既知の制約・リスク
- hydra/GitLab 両対応により設定複雑度が増すため、feature flag で明示切替。
- WebSocket 多接続でのリソース逼迫リスク。心拍監視と idle timeout を実装。
- TypeScript + Vue + Node の複合ビルドは時間増大の恐れ。ビルドキャッシュ (turbo 等) を検討。
- 状態遷移図レンダリングは外部ツール依存のため、可視化要件変更時は別途調整が必要。
