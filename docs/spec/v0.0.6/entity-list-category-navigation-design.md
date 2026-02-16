---
title: Entity List Category Navigation - Detailed Design
version: v0.0.6
date: 2026-02-17
status: draft
---

# EntityListSection カテゴリ階層ナビゲーション 詳細設計

## 1. 目的

`EntityListSection.vue` の一覧表示を、カテゴリ階層を意識したナビゲーション付き表示へ拡張する。

本書は **実装前の詳細設計** を定義し、実装は含まない。

## 2. 変更要求（要約）

- `EntityListSection` は **指定したカレントカテゴリ直下のデータのみ** を表示する。
- カレントカテゴリに **子カテゴリが存在する場合は一覧に表示** し、フォルダのように子カテゴリへ移動できるようにする。
- カレントカテゴリから上位へ戻るため、**title と table の間に「親カテゴリに移動」ボタン** を追加する。
- title と table の間に、**現在位置を示すパンくず（breadcrumb list）** を表示する。
- 既存の Handlebars パンくず例を Vue 実装へ変換して適用する。

## 3. スコープ

### 3.1 対象
- `EntityListSection` の表示対象制御（カテゴリ直下フィルタ）
- 子カテゴリの一覧表示（フォルダ行）
- 子カテゴリへの遷移イベント
- 親カテゴリへの遷移ボタン
- パンくず表示・クリック遷移
- View 側との責務分担（カテゴリデータ供給、遷移状態保持）

### 3.2 非対象
- カテゴリマスタ構造そのものの変更
- 永続化仕様（DB/Repository）の変更
- 新規機能（検索、ソート、ページング、ドラッグ移動等）
- List操作（編集/競合解消/削除）の仕様変更
- ルーティング方式の変更（URL同期要件は本書の対象外）

## 4. 現状分析

### 4.1 現状の `EntityListSection` 特性
- `rows` をそのまま `v-for` 描画している。
- `resolveRowId` で `ID` または `id` から行IDを決定している。
- タイトルとテーブルの間に補助ナビゲーション領域は存在しない。
- 行の操作は `edit` / `resolve-conflict` / `delete` の3種に固定。

### 4.2 ギャップ
- カレントカテゴリ概念がないため階層移動できない。
- 子カテゴリを「フォルダ行」として表示する枠組みがない。
- パンくずと親移動ボタンのUI領域がない。

## 5. 要件詳細

## 5.1 カレントカテゴリ直下のみ表示

- 一覧表示対象を次の2種類に限定する。
  1. `parentCategoryId === currentCategoryId` を満たす子カテゴリ
  2. `categoryId === currentCategoryId` を満たすエンティティ行
- それ以外（孫以下・他枝）は描画しない。
- ルート表示時（`currentCategoryId` がルートを示す値）も同一ルールで処理する。

## 5.2 子カテゴリ表示（フォルダ遷移）

- 子カテゴリはエンティティ行より上に表示する（ナビゲーション優先）。
- 子カテゴリ行は「フォルダである」と判別できる表示にする。
- 子カテゴリ行クリックで `enter-category` イベントを emit し、親Viewがカレントカテゴリを更新する。
- フォルダ行には `edit/delete` 等のエンティティ操作ボタンは表示しない。

## 5.3 親カテゴリに移動ボタン

- 配置: title と breadcrumb の同一ナビゲーション領域（titleとtableの間）。
- ラベル: `親カテゴリに移動`
- 動作: クリックで `move-to-parent` イベントを emit。
- 活性条件:
  - ルートカテゴリでは非活性（または非表示）
  - ルート以外で活性

## 5.4 パンくず表示

- 配置: title と table の間。
- 表示形式:
  - `ルート › 子 › 孫 ...` の順で表示
  - 最終要素（現在地）は非クリック
  - 途中要素はクリック可能
- クリック時: `navigate-breadcrumb` イベントに対象カテゴリパスを渡して emit。

## 6. Handlebars例のVue変換設計

## 6.1 元要件（Handlebars）

- `each breadcrumbs` で順次描画
- `@last` で current 判定
- `isRootPath` でルート表示（アイコン付き）
- 非最終項目のみクリック可能

## 6.2 Vueでの等価実装方針

- `v-for="(crumb, index) in breadcrumbs"`
- `const isLast = index === breadcrumbs.length - 1`
- `:class` にて `current` / `root-path` を付与
- `@click` は `!isLast` の場合のみ有効化
- セパレータ `›` は `!isLast` の場合のみ描画

設計上のレンダリングイメージ:

```vue
<span
  v-for="(crumb, index) in breadcrumbs"
  :key="crumb.path"
  :class="['breadcrumb-item', { current: index === breadcrumbs.length - 1, 'root-path': crumb.isRootPath }]"
  :style="{ cursor: index === breadcrumbs.length - 1 ? 'default' : 'pointer' }"
  @click="index === breadcrumbs.length - 1 ? undefined : onBreadcrumbClick(crumb.path)"
>
  <span v-if="crumb.isRootPath" class="material-icons">folder_special</span>
  {{ crumb.name }}
</span>
<span v-if="index !== breadcrumbs.length - 1" class="breadcrumb-separator">›</span>
```

※ 上記は設計意図を示す概念例。実装時はテンプレート構造の妥当な分割で可。

## 7. データモデル設計（コンポーネントI/F案）

## 7.1 追加Props（案）

```ts
type CategoryNode = {
  id: string;
  name: string;
  parentId: string | null;
};

type BreadcrumbItem = {
  name: string;
  path: string;
  categoryId: string;
  isRootPath: boolean;
};

type PropsExtension = {
  currentCategoryId: string | null;
  childCategories: CategoryNode[];
  breadcrumbs: BreadcrumbItem[];
  canMoveParent: boolean;
};
```

## 7.2 追加Emits（案）

```ts
type EmitsExtension = {
  (e: 'enter-category', categoryId: string): void;
  (e: 'move-to-parent'): void;
  (e: 'navigate-breadcrumb', categoryId: string): void;
};
```

## 7.3 責務分離

- `EntityListSection`:
  - 受け取った `childCategories` / `rows` / `breadcrumbs` の描画
  - クリックイベントの通知
- 親View:
  - カレントカテゴリ状態管理
  - `childCategories` と `rows` のフィルタ済みデータ供給
  - パンくず配列生成

## 8. UI配置設計

`EntityListSection` 内の表示順を次の通りとする。

1. title
2. ナビゲーション領域
   - `親カテゴリに移動` ボタン
   - breadcrumb list
3. table
   - 先頭: 子カテゴリ行（存在時）
   - 次: エンティティ行
   - 空表示: 子カテゴリ・エンティティ双方が0件のときのみ

## 9. 互換性・制約

1. 既存の編集/競合解消/削除フローを壊さない。
2. Tailwind既存トークン中心で構成し、新規デザインテーマを導入しない。
3. 既存イベント名は維持し、追加イベントは後方互換性を保つ。
4. ルート判定は親Viewが責務を持ち、コンポーネント内で業務ルールを固定しない。

## 10. 変更対象ファイル（実装時予定）

- 主対象
  - `src/components/common/EntityListSection.vue`
- 連携調整（必要時）
  - `src/views/ArtifactView.vue`
  - `src/views/ProcessView.vue`
  - `src/views/TriggerView.vue`
  - カテゴリ関連Composable/Store

※ 本フェーズではドキュメント作成のみ。ソースコードは変更しない。

## 11. テスト設計（実装後）

## 11.1 Unit（EntityListSection）
- `currentCategoryId` に対応した描画（直下のみ）
- 子カテゴリ行の表示順・表示件数
- `enter-category` emit
- `move-to-parent` emit と活性制御
- breadcrumb表示・current判定・クリック可否
- `navigate-breadcrumb` emit

## 11.2 統合（各View）
- 子カテゴリ→子階層への遷移で表示内容が切り替わる
- 親カテゴリ移動で1階層戻る
- breadcrumbクリックで指定階層へジャンプできる
- 既存の編集/削除/競合解消が従来どおり動作する

## 12. 受け入れ基準（設計観点）

1. カレントカテゴリ直下表示ルールが明確に定義されている。
2. 子カテゴリ遷移、親カテゴリ遷移、breadcrumb遷移のイベント設計が定義されている。
3. Handlebars例をVueへ変換する方針が具体化されている。
4. titleとtableの間に必要UI（親移動ボタン、breadcrumb）を配置する設計が明示されている。
5. 本書が `docs/spec/v0.0.6` 配下に英名ファイルで作成されている。

## 13. 実装フェーズ引き継ぎ事項

- 先に `EntityListSection` のI/F拡張を実施し、次に各Viewへ段階適用する。
- 適用時は「カテゴリ直下表示」ロジックをView側で統一関数化し重複を避ける。
- 既存E2E/Unitに加え、カテゴリ階層ナビゲーション専用テストを追加して回帰を防止する。

---

以上。実装は次フェーズで行う。
