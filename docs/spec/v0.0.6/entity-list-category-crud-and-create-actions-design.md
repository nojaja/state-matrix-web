---
title: Entity List Category CRUD and Create Actions - Detailed Design
version: v0.0.6
date: 2026-02-17
status: draft
---

# EntityListSection 作成系ボタン拡張 + カテゴリ操作拡張 詳細設計

## 1. 目的

`EntityListSection.vue` のナビゲーション領域および操作列を拡張し、以下を実現する。

1. `move-to-parent` ボタン横に、
   - 新規カテゴリ追加ボタン
   - 新規データ追加ボタン（タブごとのエンティティ、例: ProcessViewではプロセス）
   を追加する。
2. 操作列に、カテゴリ行向けの
   - カテゴリ名称変更
   - カテゴリ削除
   を追加する。
3. カテゴリ名称変更/削除の動作は、`CategoryView.vue` の既存挙動を踏襲する。

本書は **実装前の詳細設計** を定義し、実装は含まない。

## 2. 変更要求（要約）

- UI追加（EntityListSection内）
  - `親カテゴリに移動` の横に `新規カテゴリ追加` と `新規{タブ対象}追加` を配置
- カテゴリ行の操作追加
  - 既存の `開く` に加えて `名称変更` `削除` を追加
- 挙動準拠
  - `CategoryView.vue` の名称変更（モーダル入力 + 保存）
  - `CategoryView.vue` の削除（確認ダイアログ + 子カテゴリ存在時の削除禁止）

## 3. スコープ

### 3.1 対象
- `src/components/common/EntityListSection.vue`
- `src/views/ArtifactView.vue`
- `src/views/ProcessView.vue`
- `src/views/TriggerView.vue`
- （必要時）カテゴリ編集モーダルの共通化用コンポーネント/Composable

### 3.2 非対象
- `CategoryView.vue` 自体の機能変更
- ストア永続化仕様の変更（Repository/DBフォーマット変更）
- 新規の検索/ソート/ページング
- 既存のエンティティ行操作（編集/競合解消/削除）ロジック変更

## 4. 現状分析

## 4.1 EntityListSection 現状

- title と table の間にナビゲーション領域があり、`move-to-parent`（↑）と breadcrumb を表示
- 子カテゴリ行の操作は `開く` のみ
- エンティティ行の操作は `編集` `競合解消` `削除`

## 4.2 CategoryView 準拠対象

`CategoryView.vue` では以下の動作が成立している。

- 名称変更
  - 編集モーダルを開く
  - 既存名称を初期値として入力
  - 保存時に `categoryStore.update` で `Name` を更新
- 削除
  - `confirm` でユーザー確認
  - 子カテゴリが存在する場合は `alert` で中断（削除不可）
  - 条件を満たす場合のみ `categoryStore.remove` 実行

本設計では、上記をEntityListSection経由でも同等に成立させる。

## 5. 要件詳細

## 5.1 ナビゲーション領域ボタン拡張

### 5.1.1 追加ボタン

`move-to-parent` と同一行に以下2ボタンを追加する。

1. `新規カテゴリ追加`
2. `新規{タブエンティティ}追加`
   - ArtifactView: `新規作成物追加`
   - ProcessView: `新規プロセス追加`
   - TriggerView: `新規トリガー追加`

### 5.1.2 配置順

左から以下順を基本とする。

1. `親カテゴリに移動`
2. `新規カテゴリ追加`
3. `新規{タブエンティティ}追加`
4. breadcrumb

### 5.1.3 期待動作

- `新規カテゴリ追加`
  - 親Viewへイベント通知し、現在カテゴリ配下へカテゴリを追加するフローへ入る
  - ルート表示時はルートカテゴリ追加として扱う
- `新規{タブエンティティ}追加`
  - 親Viewへイベント通知し、フォームを新規作成モードへ遷移
  - 編集中データは `resetForm` 系処理でクリア
  - 可能なら `currentListCategoryId` をフォームの `CategoryID` 初期値に反映

## 5.2 カテゴリ行の操作拡張

## 5.2.1 追加操作

カテゴリ行（`childCategories` 描画行）に以下を追加する。

- `開く`（既存）
- `名称変更`（追加）
- `削除`（追加）

## 5.2.2 名称変更動作（CategoryView踏襲）

- 操作起点: カテゴリ行の `名称変更` ボタン
- 処理:
  1. 対象カテゴリ情報を親Viewへ通知
  2. 編集モーダルを開く
  3. 既存名称を初期値として表示
  4. 保存で `categoryStore.update({ ...category, Name: 新名称 })`
- バリデーション:
  - 空文字は保存しない（CategoryViewの `confirmSave` と同等）

## 5.2.3 削除動作（CategoryView踏襲）

- 操作起点: カテゴリ行の `削除` ボタン
- 処理:
  1. `confirm` による削除確認
  2. 対象カテゴリに子カテゴリがある場合は `alert` を表示して中断
  3. 問題なければ `categoryStore.remove(categoryId)`
- 確認文言/警告文言はCategoryView既存文言に揃える

## 5.2.4 イベント伝播制御

- カテゴリ行全体クリックは `enter-category`（開く）に利用中のため、
  `名称変更` と `削除` は `click.stop` を適用し、不要な階層遷移を防止する。

## 6. コンポーネントI/F拡張設計（案）

## 6.1 追加Props

```ts
type PropsExtension = {
  createCategoryLabel?: string;     // default: '新規カテゴリ追加'
  createEntityLabel?: string;       // 例: '新規プロセス追加'
  showCreateButtons?: boolean;      // default: true
};
```

## 6.2 追加Emits

```ts
type EmitsExtension = {
  (e: 'create-category', parentCategoryId: string | null): void;
  (e: 'create-entity', categoryId: string | null): void;
  (e: 'rename-category', categoryId: string): void;
  (e: 'delete-category', categoryId: string): void;
};
```

- `create-*` は現在表示カテゴリ文脈を引数に含める。
- `rename-category` / `delete-category` は対象カテゴリIDを通知。

## 6.3 後方互換

- 既存イベント（`edit` `resolve-conflict` `delete` `enter-category` `move-to-parent` `navigate-breadcrumb`）は維持。
- 既存利用Viewで新規イベント未購読時でも動作を壊さない（追加のみ）。

## 7. View別適用設計

## 7.1 ArtifactView

- `createEntityLabel`: `新規作成物追加`
- `@create-entity`
  - `resetForm()` 実行
  - `currentListCategoryId` が存在する場合 `artifactStore.setDraft({ CategoryID: currentListCategoryId })`
- `@create-category`
  - CategoryView踏襲のカテゴリ作成モーダル（親ID指定）を開く
- `@rename-category` / `@delete-category`
  - CategoryView踏襲ロジックを適用

## 7.2 ProcessView

- `createEntityLabel`: `新規プロセス追加`
- `@create-entity`
  - `resetForm()`
  - 必要に応じて `processStore.setDraft({ CategoryID: currentListCategoryId })`
- カテゴリ操作は上記同様

## 7.3 TriggerView

- `createEntityLabel`: `新規トリガー追加`
- `@create-entity`
  - `resetForm()`
  - 必要に応じて `triggerStore.setDraft({ CategoryID: currentListCategoryId })`
- カテゴリ操作は上記同様

## 8. UI/UX制約

1. 追加ボタンは既存Tailwindトークン内で実装し、新規テーマ導入は行わない。
2. 既存ボタン順（エンティティ操作）と競合表示は維持する。
3. カテゴリ行の操作追加は最小差分で行い、既存の「開く」導線を残す。
4. `move-to-parent` の有効/無効制御（ルート時無効）を維持する。

## 9. 変更対象ファイル（実装時予定）

- 主対象
  - `src/components/common/EntityListSection.vue`
- 連携対象
  - `src/views/ArtifactView.vue`
  - `src/views/ProcessView.vue`
  - `src/views/TriggerView.vue`
- 必要時
  - カテゴリ編集モーダル共通化ファイル（新規）

※ 本フェーズではドキュメント作成のみ。ソースコードは変更しない。

## 10. テスト設計（実装後）

## 10.1 Unit（EntityListSection）

- `新規カテゴリ追加` ボタンで `create-category` emit
- `新規{タブエンティティ}追加` ボタンで `create-entity` emit
- カテゴリ行 `名称変更` で `rename-category` emit
- カテゴリ行 `削除` で `delete-category` emit
- カテゴリ行操作時に `enter-category` が誤発火しない（`click.stop`）

## 10.2 View統合

- 各Viewで `create-entity` が新規モード遷移（フォーム初期化）になる
- カテゴリ名称変更がCategoryView同等フローで保存される
- カテゴリ削除がCategoryView同等条件（子カテゴリ存在時拒否）で動作する
- 既存エンティティ行の編集/競合解消/削除が回帰しない

## 11. 受け入れ基準（設計観点）

1. `move-to-parent` 横の2ボタン追加仕様が明記されている。
2. カテゴリ行の `名称変更` `削除` が操作列要件として定義されている。
3. CategoryView踏襲の具体条件（モーダル編集・confirm/alert・子カテゴリ削除禁止）が明記されている。
4. EntityListSectionのI/F拡張（Props/Emits）が定義されている。
5. 本書が `docs/spec/v0.0.6` 配下に英名ファイルで作成されている。

## 12. 実装フェーズ引き継ぎ事項

- 先に `EntityListSection` のI/F拡張を実施し、次に3Viewを順次接続する。
- カテゴリ編集/削除ロジックは重複を避けるため共通化（Composableまたはユーティリティ）を検討する。
- 実装後はUnitを先行し、続いて既存E2E影響範囲を回帰確認する。

---

以上。実装は次フェーズで行う。
