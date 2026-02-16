---
title: List Section Common Component - Detailed Design
version: v0.0.6
date: 2026-02-16
status: draft
---

# Artifact/Process/Trigger List Section 共通化 詳細設計

## 1. 目的

`ArtifactView.vue`、`ProcessView.vue`、`TriggerView.vue` の `List Section` を、
**データ定義と行操作を受け取って一覧表示する共通コンポーネント**へ統合する。

本書は **実装前の詳細設計** を定義し、実装は含まない。

## 2. 変更要求（要約）

- 対象画面:
  - `src/views/ArtifactView.vue`
  - `src/views/ProcessView.vue`
  - `src/views/TriggerView.vue`
- 対象領域: 各Viewの `List Section`
- 変更内容:
  - テーブル描画と共通操作（編集/競合解消/削除）を共通コンポーネント化
  - 各Viewは「列定義」「行データ」「個別セル描画」「操作ハンドラ」を注入

## 3. スコープ

### 3.1 対象
- List Section テーブル描画の共通化
- 空データ表示（`データがありません`）の共通化
- 競合マーカー表示（`●`）と競合解消ボタン表示条件の共通化
- 編集/競合解消/削除ボタン群の共通化
- 各Viewの列差分を受け取るAPI（Props/Slot）設計

### 3.2 非対象
- Form Section（入力フォーム）の変更
- ストア構造の変更（artifact/process/trigger store）
- 競合判定ロジック（`metadataStore.conflictData` の仕様）変更
- ルーティングやモーダル仕様変更
- 新規機能追加（フィルタ・ページング・ソート等）

## 4. 現状分析

## 4.1 共通点

3画面とも以下を共有する。

1. `bg-white p-6 rounded shadow` 系のListコンテナ
2. 見出し + table構成
3. `v-for` で行描画、`ID` をkeyに利用
4. 行末に操作列を持つ
   - 編集ボタン
   - 競合がある場合のみ「競合解消」ボタン
   - 削除ボタン
5. 空配列時に `データがありません` を表示
6. 競合あり行に `●`（赤）を名称横へ表示

## 4.2 差分

- 見出し文言
  - Artifact: `登録済作成物一覧`
  - Process: `登録済プロセス一覧`
  - Trigger: `登録済トリガー一覧`
- 列数/列名/セル内容
  - Artifact: 名称/カテゴリ/内容/備考/操作
  - Process: 工程名/カテゴリ/説明/操作
  - Trigger: トリガー名/カテゴリ/関連プロセス/条件/操作
- 空行の `colspan`
  - Artifact: 5
  - Process: 4
  - Trigger: 5
- Triggerのみ `overflow-x-auto` をコンテナに付与

## 5. 共通コンポーネント設計

## 5.1 コンポーネント名

- `EntityListSection`

## 5.2 配置（実装時予定）

- `src/components/common/EntityListSection.vue`

## 5.3 型設計（案）

```ts
type EntityListColumn = {
  key: string;
  label: string;
  headerClass?: string;
  cellClass?: string;
};

type EntityListAction = {
  key: 'edit' | 'resolveConflict' | 'delete';
  label: string;
  className: string;
  visible?: (rowId: string) => boolean;
};

type EntityListRow = {
  id: string;
};
```

## 5.4 Props 設計（案）

```ts
type Props = {
  title: string;
  columns: EntityListColumn[];
  rows: EntityListRow[];
  emptyMessage?: string;               // default: 'データがありません'
  containerClass?: string;             // 既存Tailwindクラス維持用
  tableClass?: string;                 // default: 'min-w-full divide-y divide-gray-200'
  showConflictDot?: (rowId: string) => boolean;
  showResolveButton?: (rowId: string) => boolean;
};
```

- `rows` は最小要件として `id` を必須とし、その他データは親側で保持する。
- 各セルの実データ描画は `slot`（後述）で親に委譲する。

## 5.5 Emits 設計（案）

```ts
type Emits = {
  (e: 'edit', rowId: string): void;
  (e: 'resolve-conflict', rowId: string): void;
  (e: 'delete', rowId: string): void;
};
```

## 5.6 Slot 設計（案）

- `cell-{column.key}` 命名スロットで列ごとの表示を親が差し込む。
- 受け取りスコープ:
  - `row`: 行オブジェクト
  - `rowId`: 行ID

例:
- `cell-name`
- `cell-category`
- `cell-description`
- `cell-relatedProcess`
- `cell-condition`

## 5.7 操作列（共通描画）

- 操作列はコンポーネント内部で共通レンダリングする。
- ボタン構成は現行踏襲:
  - 編集（常時）
  - 競合解消（条件付き）
  - 削除（常時）
- ボタン文言・Tailwindクラスは現状維持。

## 6. 画面別適用設計

## 6.1 ArtifactView

- `title`: `登録済作成物一覧`
- `columns`:
  - `name`, `category`, `content`, `note`
- `cell-name` で `Name + conflict dot`
- `cell-category` で `getCategoryName(CategoryID)`
- `cell-content` / `cell-note` は `truncate max-w-xs` を維持
- `showResolveButton`: `metadataStore.conflictData...[item.ID]` 条件

## 6.2 ProcessView

- `title`: `登録済プロセス一覧`
- `columns`:
  - `name`, `category`, `description`
- `cell-name` で `Name + conflict dot`
- `cell-category` で `getCategoryName(CategoryID)`
- `cell-description` で `Description`

## 6.3 TriggerView

- `title`: `登録済トリガー一覧`
- `columns`:
  - `name`, `category`, `relatedProcess`, `condition`
- `cell-name` で `Name + conflict dot`
- `cell-category` で `getCategoryName(CategoryID)`
- `cell-relatedProcess` で `getProcessName(ProcessTypeID)`
- `cell-condition` で `Timing`
- `containerClass` で `overflow-x-auto` 維持

## 7. 責務分離

## 7.1 共通コンポーネント責務
- テーブル外枠・ヘッダー・空表示の描画
- 共通操作ボタンの描画とイベント通知
- 競合マーカー/競合解消ボタン表示の共通判定呼び出し

## 7.2 各View責務
- 行データ生成（store依存）
- 列データの値変換（カテゴリ名/関連プロセス名解決）
- `onEdit` / `openCompare` / `onDelete` の業務処理
- 競合判定の元データ提供（`metadataStore`）

## 8. 互換性・制約

1. 見た目（クラス、文言、ボタン順）を維持し、UXを変えない。
2. 既存の競合判定式はそのまま利用する。
3. 新規UI機能（ソート、検索、ページング）は追加しない。
4. 既存の `onEdit` / `onDelete` / `openCompare` 関数のシグネチャ変更は最小化する。

## 9. 変更対象ファイル（実装時予定）

- 新規
  - `src/components/common/EntityListSection.vue`
- 既存改修
  - `src/views/ArtifactView.vue`
  - `src/views/ProcessView.vue`
  - `src/views/TriggerView.vue`

※ 本フェーズではドキュメント作成のみ。ソースコードは変更しない。

## 10. テスト設計（実装後）

## 10.1 Unit
- `EntityListSection`:
  - ヘッダー描画
  - 行描画
  - 空表示
  - `edit` / `resolve-conflict` / `delete` emit
  - `showResolveButton` 条件制御

## 10.2 View統合
- Artifact/Process/Trigger 各Viewで以下を確認
  - 列内容が従来どおり表示される
  - 競合マーカー表示条件が維持される
  - 3操作ボタンの動作が維持される

## 11. 受け入れ基準（設計観点）

1. 3ViewのList Section共通化方針が、Props/Slots/Emitsで明確に定義されている。
2. 各View固有の列差分と表示差分が吸収設計として記載されている。
3. 既存UX維持（文言・ボタン順・競合表示）方針が明示されている。
4. 本書が `docs/spec/v0.0.6` 配下に英名ファイルで作成されている。

## 12. 実装フェーズ引き継ぎ事項

- 先に `EntityListSection` を追加し、その後3Viewを段階置換する。
- 1画面ずつ置換し、表示差分がないことを都度確認する。
- 置換完了後に Unit + 既存E2E（影響範囲）で回帰確認する。

---

以上。実装は次フェーズで行う。
