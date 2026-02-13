**概要**
- 目的: `CausalRelationsTypes` のスキーマ変更（`ActionTriggerTypeID` → `ProcessTypeID`）に伴う設計変更・実装手順・影響範囲を整理する。

**変更の要点**
- 旧: `CausalRelationsTypes` が `ActionTriggerTypeID: uuid` でアクショントリガーに紐づく。
- 新: `CausalRelationsTypes` が `ProcessTypeID: uuid` でプロセスタイプに紐づく。
- 結果: 因果関係がトリガー単位からプロセス単位へ移動し、トリガーと因果関係のライフサイクル（作成/削除/共有）の意味合いが変わる。

**影響箇所（ファイル一覧）**
- 仕様/図
  - [docs/spec/v0.0.5/ER.md](docs/spec/v0.0.5/ER.md) : 変更済み（参照用）
- 型定義
  - [src/types/models.ts](src/types/models.ts) : `CausalRelationType` のフィールドを更新
- ストア / ビジネスロジック
  - [src/stores/triggerStore.ts](src/stores/triggerStore.ts) : relations の取得・作成・削除ロジックを見直す
- UI
  - [src/views/TriggerView.vue](src/views/TriggerView.vue) : フォームで作成する relations 型と送信ロジックの修正
- リポジトリ / 永続化
  - [src/repositories/index.ts](src/repositories/index.ts) : 永続化スキーマの確認（`CausalRelationsTypes` 保存内容）
- テスト
  - `test/unit/behavior/v0.0.4/stores/triggerStore.test.ts` 等: フィクスチャ・期待値を `ProcessTypeID` ベースへ更新

**詳細仕様変更（要点）**
- `CausalRelationType`（旧）
  - フィールド: `ID`, `ActionTriggerTypeID`, `ArtifactTypeID`, `CrudType`, `CreateTimestamp`, `LastUpdatedBy`
- `CausalRelationType`（新）
  - フィールド: `ID`, `ProcessTypeID`, `ArtifactTypeID`, `CrudType`, `CreateTimestamp`, `LastUpdatedBy`
- 振る舞い変更
  - relations の所属キーが `ProcessTypeID` になるため、同一 `ProcessTypeID` を参照する複数トリガー間で relations が共有されうる。
  - トリガー削除時に対応する relations を自動削除する既存ロジックは不適切となる可能性がある（要ビジネス判断）。

**データ互換／移行方針**
- 既存データの扱い
  - 永続データに `ActionTriggerTypeID` のみが残っている場合、読み込み互換レイヤーを実装する:
    - 読み込み時に `ActionTriggerTypeID` を検知したら、該当トリガーの `ProcessTypeID` を参照して `ProcessTypeID` を付与して扱う（一時変換）。
  - マイグレーション推奨案:
    1. 既存 `CausalRelationsTypes/*.json` をスキャンし `ProcessTypeID` が未存在かつ `ActionTriggerTypeID` が存在するレコードを抽出。
    2. 抽出したレコード毎に、対応する `ActionTriggerTypes/<id>.json` を読み `ProcessTypeID` を取り出しセット。
    3. 新しい形式で上書き保存（バックアップを先に作成）。
- 互換性レイヤ実装案（短期）
  - リポジトリの `getAll()` / `getById()` 実装で、読み込み時に自動で `ActionTriggerTypeID` → `ProcessTypeID` マッピングを行う。
  - 書き込みは新仕様（`ProcessTypeID`）固定。

**実装（修正）手順（開発順序、実装前にレビュー必須）**
1. ドキュメント確認と合意
   - 本設計書をレビューして合意を得る（特にトリガー削除時の relations の取り扱い）。
2. 型定義の更新（先行）
   - [src/types/models.ts](src/types/models.ts) の `CausalRelationType` を `ActionTriggerTypeID` → `ProcessTypeID` に置換。
   - `EntityType` 配列や他の参照箇所に影響が無いか確認。
3. 互換性レイヤの実装（オプション・推奨）
   - [src/repositories/index.ts] の `VirtualFsRepository` 読み込みにて、旧フィールドを検知してマッピングするロジックを追加。テストデータの壊滅を防ぐ。
4. ストア修正（機能変更のコア）
   - [src/stores/triggerStore.ts](src/stores/triggerStore.ts)
     - `getRelationsByTriggerId(id)` を以下の様に変更:
       - 取得対象トリガーの `ProcessTypeID` を取得し、`state.relations.filter(r => r.ProcessTypeID === trigger.ProcessTypeID)` を返す。
     - `addTrigger()` 内で relation を作成する際、`ProcessTypeID` を `triggerId` ではなく `trigger.ProcessTypeID`（または triggerPartial.ProcessTypeID）に設定する。
     - `removeTrigger()` の振る舞いをビジネス合意に従って変更する（トリガー削除で relations を削除するか、残すか）。
5. UI 修正
   - [src/views/TriggerView.vue]
     - relations の `Omit` 型注釈を `ActionTriggerTypeID` ではなく `ProcessTypeID` ベースに修正。
     - `onSubmit()` 等で store に渡す relations を `ProcessTypeID` を想定して構築/送信する（ただし store 側で `ProcessTypeID` を付与する設計でも可）。
6. リポジトリ / 永続化の検証
   - VirtualFS に保存される JSON のスキーマが新仕様に沿うことを確認。
7. テスト更新
   - 単体テスト内のフィクスチャ、期待値を `ProcessTypeID` ベースに書き換え。必要に応じて新しいユースケース（共有される relations の挙動）を追加。
8. ローカルデータのマイグレーション実行（必要時）
   - マイグレーションスクリプトを実行し、バックアップを保存してからデータを更新。
9. レビュー & 結合テスト
   - CI でテストを実行し、UI 操作で確認。

**テスト変更（主な対応箇所）**
- 単体テストで `ActionTriggerTypeID` を参照している箇所をすべて `ProcessTypeID` に更新。
  - 例: `test/unit/behavior/v0.0.4/stores/triggerStore.test.ts`
- 既存のトリガー削除テストは、relations の削除期待が正しいか（削除する仕様なら残す）を再評価し修正。
- 追加のテストケース提案:
  - 同一 `ProcessTypeID` を参照する複数トリガーが存在するときの relations の読取/編集/削除の挙動。
  - 旧データ（`ActionTriggerTypeID` が存在）からの読み込み互換性テスト。

**注意事項 / 政策的判断が必要な点**
- トリガー削除時に relations を削除するかどうかは業務ルール次第（プロセス側の共通定義か、トリガー固有か）。開発着手前にプロダクトオーナーと合意必須。
- マイグレーションは必ずバックアップを取ること。破壊的変更なのでリハーサル実行推奨。
- UI 表示で「作成物の入出力」がプロセス単位になると、編集 UX が変わる可能性がある（利用者に通知が必要）。

**次のアクション（推奨）**
1. 本ドキュメントのレビュー・承認（特にトリガー削除の扱い）。
2. 合意後、`src/types/models.ts` の型更新を行い、以降の実装は段階的に進める。

---
作成者: 開発チーム自動生成（要レビュー）
作成日時: 2026-02-13
