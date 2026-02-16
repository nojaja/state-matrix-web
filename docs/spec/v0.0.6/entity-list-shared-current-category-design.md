---
title: Entity List Shared Current Category - Detailed Design
version: v0.0.6
date: 2026-02-17
status: draft
---

# EntityListSection カレントカテゴリ全体共有 詳細設計

## 1. 目的

`EntityListSection` のカレントカテゴリ（現在表示しているカテゴリ階層）を、
タブ（`ArtifactView` / `ProcessView` / `TriggerView`）をまたいで共有し、
どのタブを開いても同じカテゴリ位置を表示できるようにする。

本書は **実装前の詳細設計** を定義し、実装は含まない。

## 2. 変更要求（要約）

- EntityListSectionのカレントカテゴリを **画面個別状態からアプリ共通状態へ移行** する。
- 任意タブでカテゴリ遷移（子へ移動、親へ戻る、パンくず遷移）した結果を、他タブでも同一に反映する。
- タブ切替時に、EntityListSectionの表示位置が常に最新の共有カレントカテゴリを参照する。

## 3. スコープ

### 3.1 対象
- EntityListSectionのカテゴリナビゲーション状態管理方式
- `ArtifactView.vue` / `ProcessView.vue` / `TriggerView.vue` のカテゴリ状態参照元
- カテゴリ遷移イベント（`enter-category` / `move-to-parent` / `navigate-breadcrumb`）の接続先
- 共有状態更新時の一覧表示・パンくず表示同期

### 3.2 非対象
- カテゴリデータモデルの仕様変更
- Repository/DB永続化フォーマット変更
- Category CRUD仕様変更
- URLクエリとの双方向同期（本書では必須要件外）
- 新規UI（検索/ソート/ページング）追加

## 4. 背景と現状課題

- 現状はタブごとにカレントカテゴリを保持しているため、タブ切替時に表示位置が揃わない。
- ユーザーは「同じカテゴリ位置で別エンティティを横断確認したい」が、毎回カテゴリを再選択する必要がある。
- その結果、ナビゲーション操作が重複し、操作効率と一貫性が低下する。

## 5. 要件詳細

## 5.1 機能要件

1. 共有カレントカテゴリの単一状態を持つ。
2. いずれかのタブでカテゴリ遷移した時、共有カレントカテゴリを更新する。
3. 他タブは次回表示時に同じ共有カレントカテゴリを用いてEntityListSectionを描画する。
4. 共有カレントカテゴリが未設定の場合はルートカテゴリを採用する。

## 5.2 遷移要件

- `enter-category(categoryId)`:
  - 共有カレントカテゴリを `categoryId` に更新する。
- `move-to-parent()`:
  - 共有カレントカテゴリを1階層上に更新する（ルートでは据え置き）。
- `navigate-breadcrumb(categoryId)`:
  - 共有カレントカテゴリを `categoryId` に更新する。

## 5.3 一貫性要件

- 各タブはローカル状態ではなく共有状態を単一の参照元（single source of truth）とする。
- パンくず、子カテゴリ一覧、エンティティ一覧のフィルタ基準は同一の共有カレントカテゴリに統一する。

## 6. 状態管理設計（案）

## 6.1 共有状態の配置

Piniaストアに「EntityListナビゲーション専用状態」を配置する。

- 候補A: 既存ストアへ最小追加
- 候補B: 専用ストア新設（推奨）

本設計では責務分離を優先し、**候補B（専用ストア新設）** を採用する。

## 6.2 ストアI/F（案）

```ts
type EntityListNavigationState = {
  currentCategoryId: string | null;
};

type EntityListNavigationActions = {
  setCurrentCategory(categoryId: string | null): void;
  moveToParent(categories: { ID: string; ParentCategoryID: string | null }[]): void;
  resetToRoot(): void;
};
```

- `currentCategoryId: null` はルートを表す運用を基本とする。
- `moveToParent` はカテゴリ集合から親を解決して状態更新する。

## 6.3 導出データ

共有状態から以下を各Viewで導出する。

- 現在カテゴリ直下の子カテゴリ
- 現在カテゴリ直下の対象エンティティ行
- パンくず配列
- 親移動可否（`canMoveParent`）

## 7. View接続設計

## 7.1 対象View

- `ArtifactView.vue`
- `ProcessView.vue`
- `TriggerView.vue`

## 7.2 接続ルール

1. 各Viewの `EntityListSection` へ渡す `currentCategoryId` は共有ストア値を使用する。
2. `EntityListSection` からのカテゴリ遷移イベントは共有ストアActionへ委譲する。
3. 各View固有のエンティティ処理（編集/削除/競合解消）は既存のまま維持する。

## 7.3 初期化ルール

- 共有ストア未初期化時は `resetToRoot()` 相当でルート表示に揃える。
- タブ初回表示時に、ローカルカテゴリ初期化ロジックが残っている場合は廃止または無効化する。

## 8. UI/UX制約

1. タブ切替後もカテゴリ位置が維持される以外のUXは変更しない。
2. 既存の`親カテゴリに移動`・パンくず・カテゴリ行遷移の見た目/文言を維持する。
3. 追加アニメーション・新規モーダル・新規フィルタ等は導入しない。

## 9. 互換性・リスク

## 9.1 互換性

- EntityListSectionのイベント名・Props基本契約は維持する。
- 各Viewの既存エンティティ編集系ロジックには影響を与えない。

## 9.2 想定リスク

- 旧ローカル状態の残存により、共有状態と二重管理になるリスク。
- タブ表示順に依存した初期化処理が残ると、共有状態が上書きされるリスク。

## 9.3 回避策

- カテゴリナビゲーション状態は共有ストアのみに集約する。
- Viewマウント時のカテゴリ初期化処理を監査し、共有状態優先へ統一する。

## 10. 変更対象ファイル（実装時予定）

- 新規（想定）
  - `src/stores/entityListNavigationStore.ts`
- 既存改修（想定）
  - `src/views/ArtifactView.vue`
  - `src/views/ProcessView.vue`
  - `src/views/TriggerView.vue`
  - （必要時）`src/components/common/EntityListSection.vue`

※ 本フェーズではドキュメント作成のみ。ソースコードは変更しない。

## 11. テスト設計（実装後）

## 11.1 Unit

- 共有ストアの `setCurrentCategory` / `moveToParent` / `resetToRoot` が期待どおり状態更新する。
- ルートで `moveToParent` 実行時に状態が不正遷移しない。

## 11.2 View統合

- Artifactタブでカテゴリ遷移後、Process/Triggerタブを開くと同一カテゴリ位置で表示される。
- パンくず遷移結果がタブ横断で反映される。
- 既存の編集/競合解消/削除操作に回帰がない。

## 12. 受け入れ基準（設計観点）

1. カレントカテゴリを全タブで共有する要件が明記されている。
2. 共有状態の単一管理方式（Pinia）が定義されている。
3. カテゴリ遷移イベントの更新責務が共有ストアへ集約されることが明記されている。
4. 変更対象ファイルと非対象範囲が明確に示されている。
5. 本書が `docs/spec/v0.0.6` 配下に英名ファイルで作成されている。

## 13. 実装フェーズ引き継ぎ事項

- 先に共有ストアを追加し、次に3Viewのカテゴリ参照・遷移ハンドラを置換する。
- ローカルカテゴリ状態を段階的に撤去し、二重管理を解消する。
- 実装後はUnitテストを先行し、その後タブ横断の統合確認を実施する。

---

以上。実装は次フェーズで行う。
