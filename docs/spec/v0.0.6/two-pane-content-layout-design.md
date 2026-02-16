---
title: Two Pane Content Layout - Detailed Design
version: v0.0.6
date: 2026-02-16
status: draft
---

# Artifact/Process/Trigger Content 2ペイン化 詳細設計

## 1. 目的

`ArtifactView.vue`、`ProcessView.vue`、`TriggerView.vue` の Content 部分を、
**左: List Section / 右: Form Section の2ペイン構成**に統一する。

本書は **実装前の詳細設計** を定義し、実装は含まない。

## 2. 変更要求（要約）

- 対象画面:
  - `src/views/ArtifactView.vue`
  - `src/views/ProcessView.vue`
  - `src/views/TriggerView.vue`
- 対象領域: 各Viewの Content 部分
- 変更内容:
  - 現状の縦積み構成（Form Section → List Section）を2ペインに変更
  - 左ペインを List Section
  - 右ペインを Form Section

## 3. スコープ

### 3.1 対象
- 3画面のレイアウトコンテナ構造
- List Section と Form Section の配置順（左/右）
- ペイン内スクロール設計（必要時）
- 既存セクションの見た目を維持したままの再配置

### 3.2 非対象
- Form入力項目の追加/削除/仕様変更
- Listテーブル列・操作ボタン・競合表示ロジックの仕様変更
- ストア/永続化/同期/競合解消ロジックの変更
- 新規機能追加（フィルタ、ソート、ページング等）
- ルーティング、モーダル仕様の変更

## 4. 現状分析

## 4.1 共通レイアウト（現状）

3画面とも以下の構成を取る。

1. ルートが `space-y-6` の縦積みコンテナ
2. Form Section が上段
3. List Section が下段
4. モーダルは末尾に配置

## 4.2 画面ごとの差分（現状）

- Artifact:
  - Form: 名称/内容/備考 + カテゴリ選択
  - List: `EntityListSection`（作成物列）
- Process:
  - Form: 工程名称/説明 + InputOutputDefinitionComponent
  - List: `EntityListSection`（工程列）
  - 追加で `ConflictFields` を表示する条件分岐あり
- Trigger:
  - Form: 名称/説明/条件/担当ロール + InputOutputDefinitionComponent
  - List: `EntityListSection`（トリガー列、横スクロール対応）

## 5. 目標レイアウト設計

## 5.1 レイアウト方針

- Content全体を2カラムグリッドに変更する。
- 左カラム: List Section
- 右カラム: Form Section
- UI意味論（見出し・セクション名・操作導線）は現状維持する。

## 5.2 構造（概念）

```text
Content
└─ TwoPaneContainer
   ├─ LeftPane  (List Section)
   └─ RightPane (Form Section)
```

## 5.3 レスポンシブ方針

- デスクトップ（`lg` 以上想定）: 2ペイン表示
- タブレット/モバイル（`lg` 未満想定）: 1カラム縦積みへフォールバック
  - 上: List Section
  - 下: Form Section

※ 2ペインの主対象はデスクトップUI。小画面可読性を維持するため、既存の縦積み体験をフォールバックとして残す。

## 5.4 幅配分（設計値）

- 左ペイン（List）: 7
- 右ペイン（Form）: 5

補足:
- Trigger の List は列数が多いため、左ペインをやや広く確保する。
- 実装時クラスは既存Tailwindトークンのみで表現する（新規トークン追加なし）。

## 6. 画面別適用設計

## 6.1 ArtifactView

- 左ペイン:
  - `EntityListSection`（登録済作成物一覧）
- 右ペイン:
  - 既存 Form Section（作成物管理）
- 維持事項:
  - 競合バッジ、カテゴリ選択、登録/更新ボタンの挙動

## 6.2 ProcessView

- 左ペイン:
  - `EntityListSection`（登録済プロセス一覧）
- 右ペイン:
  - 既存 Form Section（プロセス管理 + InputOutputDefinitionComponent）
- 維持事項:
  - `ConflictFields` の表示条件・表示位置（Form文脈）

## 6.3 TriggerView

- 左ペイン:
  - `EntityListSection`（登録済トリガー一覧）
  - 既存の `overflow-x-auto` 仕様を維持
- 右ペイン:
  - 既存 Form Section（トリガー管理 + InputOutputDefinitionComponent）
- 維持事項:
  - 競合バッジ、関連プロセス選択、入出力作成物編集の挙動

## 7. コンポーネント責務

## 7.1 View（Artifact/Process/Trigger）責務
- 2ペインコンテナのレイアウト管理
- List/Formの配置定義
- 既存イベントハンドラ・store連携の維持

## 7.2 既存子コンポーネント責務（変更なし）
- `EntityListSection`: 一覧表示/操作emit
- `CategorySelector` 系: カテゴリ選択UI
- `InputOutputDefinitionComponent`: 入出力定義編集
- `ModalDialog`/`ThreeWayCompareModal`: 競合解消導線

## 8. 互換性・制約

1. 見た目の基調（カード、余白、ボタン文言）は維持する。
2. 既存業務ロジック（submit/edit/delete/conflict）は変更しない。
3. 既存コンポーネント構成を活用し、過度な再設計は行わない。
4. 新規ページ・新規機能は追加しない。

## 9. 変更対象ファイル（実装時予定）

- `src/views/ArtifactView.vue`
- `src/views/ProcessView.vue`
- `src/views/TriggerView.vue`

※ 本フェーズではドキュメント作成のみ。ソースコードは変更しない。

## 10. テスト設計（実装後）

## 10.1 UI確認（手動）
- 3画面で左にList、右にFormが表示されること
- 画面幅を狭めた際に縦積みフォールバックすること
- List操作（編集/競合解消/削除）とForm操作（追加/更新/キャンセル）が従来どおり動作すること

## 10.2 回帰確認
- 競合バッジ表示、競合解消モーダル起動
- CategorySelector起動と反映
- Process/TriggerのInputOutputDefinitionComponent連携

## 11. 受け入れ基準（設計観点）

1. 3画面すべてで「左List/右Form」の2ペイン方針が明示されている。
2. 既存機能を変更しない非対象範囲が明確に定義されている。
3. レスポンシブ時のフォールバック挙動が定義されている。
4. 本書が `docs/spec/v0.0.6` 配下に英名ファイルで作成されている。

## 12. 実装フェーズ引き継ぎ事項

- 3画面を同一レイアウトパターンで順次置換する。
- 1画面ずつ置換し、各段階で表示崩れと既存操作回帰を確認する。
- 最後に3画面横断で競合解消導線とフォーム保存導線を確認する。

---

以上。実装は次フェーズで行う。
