---
title: Process Form IO Definition Placement - Detailed Design
version: v0.0.5
date: 2026-02-15
status: draft
---

# 「プロセス管理」Form Section への InputOutputDefinitionComponent 配置 詳細設計

## 1. 目的

`プロセス管理` タブ（`ProcessView`）の Form Section において、既存の送信ボタン（`プロセスを追加 / プロセスを更新`）の**直上**へ `InputOutputDefinitionComponent` を配置する。

本書は**実装前の詳細設計**を定義し、実装は含まない。

## 2. 変更要求（要約）

- 対象画面: `src/views/ProcessView.vue`
- 対象領域: Form Section（カテゴリ選択、工程名称、説明、送信ボタンがあるブロック）
- 変更内容: Form Section 内の button 群の上部に `InputOutputDefinitionComponent` を追加

## 3. スコープ

### 3.1 対象
- `ProcessView` テンプレート内の配置順序設計
- `InputOutputDefinitionComponent` の埋め込み位置定義
- 表示条件（新規作成時/編集時）の設計
- 最低限のデータ受け渡し設計（Props / Emits 接続方針）

### 3.2 非対象
- `InputOutputDefinitionComponent` 自体の新規実装/改修
- ストア/リポジトリの永続化仕様変更
- `TriggerView` 側のレイアウト変更
- E2E/Unit テストの実装

## 4. 現状レイアウト（ProcessView）

Form Section は現状、概ね以下の順序で構成される。

1. カテゴリ選択
2. 工程名称
3. 説明
4. 送信ボタン（追加/更新）
5. キャンセルボタン（編集時のみ）

## 5. 変更後レイアウト（設計）

### 5.1 配置順序

Form Section 内を以下順序に変更する。

1. カテゴリ選択
2. 工程名称
3. 説明
4. **InputOutputDefinitionComponent（新規配置）**
5. 送信ボタン（追加/更新）
6. キャンセルボタン（編集時のみ）

### 5.2 配置ルール

- `InputOutputDefinitionComponent` は送信ボタンの直前に置く。
- 既存ボタンの文言・活性条件（`isValid`）・イベント（`onSubmit`）は変更しない。
- 既存の Form Section コンテナ（`bg-white p-6 rounded shadow`）内に保持する。

## 6. 画面仕様

### 6.1 表示条件

- 基本表示は Form Section 常時表示とする。
- 編集時/新規時で内部表示差異が必要な場合は、`InputOutputDefinitionComponent` 側の既存 `mode`/`readOnly` 等の API に従う。

### 6.2 バリデーション関係

- 既存 `isValid = form.Name && form.CategoryID` の判定は本変更で変更しない。
- IO定義のバリデーション要件はコンポーネント責務とし、プロセス基本項目バリデーションとは分離する。

## 7. データ連携設計（最小）

`ProcessView` から `InputOutputDefinitionComponent` への受け渡しは、既存コンポーネント仕様に従う。

想定接続（概念）:

- 入力（Props）
  - 現在編集中のプロセスID（編集時）
  - 入出力定義データ（ドラフトまたはストア由来）
  - 必要な候補データ（既存仕様が要求する場合）
- 出力（Emits）
  - 入力定義/出力定義の更新通知
  - 必要に応じた selector 起動要求イベント

> 注記: 本ドキュメントは配置設計が主目的であり、Props/Emits の厳密シグネチャ定義は既存 `InputOutputDefinitionComponent` 設計書を正とする。

## 8. 変更対象ファイル（実装時予定）

- `src/views/ProcessView.vue`

※ 本フェーズではドキュメント作成のみ。ソースコード変更は行わない。

## 9. 受け入れ基準（設計観点）

1. `ProcessView` Form Section において、`InputOutputDefinitionComponent` の設置位置が「送信ボタン群の直上」と明確に定義されている。
2. 既存ボタン群の動作仕様（活性条件・イベント）が維持される設計である。
3. 変更範囲が Process Form Section 配置に限定され、他画面や永続化仕様に波及しないことが明記されている。
4. 本ドキュメントが実装前設計書として `docs/spec/v0.0.5` 配下に配置されている。

## 10. 実装フェーズへの引き継ぎ事項

- 実装時は `ProcessView.vue` の Form Section に対してのみ差分を適用する。
- 既存 UI スタイル（Tailwind ユーティリティ）に準拠し、不要なデザイン変更を行わない。
- 実装後は Unit/E2E 影響範囲（`ProcessView` 操作フロー）を確認する。

---

以上。実装は次フェーズで行う。
