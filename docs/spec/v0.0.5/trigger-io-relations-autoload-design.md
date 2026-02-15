---
title: Trigger IO Relations Autoload Design
version: v0.0.5
date: 2026-02-15
status: draft
---

# InputOutputDefinitionComponent: selected-process-id 連動での入出力自動反映 設計

## 1. 目的

以下 2 点を満たすための詳細設計を定義する（本書は設計のみで、実装は対象外）。

1. `InputOutputDefinitionComponent` に `selected-process-id` が設定されたタイミングで、`causalRelationStore.getRelationsByTriggerId` から `CausalRelationType[]` を取得し、`inputArtifacts` / `outputArtifacts` を自動セットする。  
2. `causalRelationStore.getRelationsByTriggerId` を、`triggerStore.getRelationsByTriggerId` のロジック複製として実装可能な形で定義する。

## 2. 背景

現状:
- `TriggerView.vue` は `onEdit` 時に `triggerStore.getRelationsByTriggerId` を利用して relation を取得し、`loadDraft` 後に表示名補完を実施している。
- `InputOutputDefinitionComponent.vue` は relation の「保存」は持つが、`selected-process-id` 変化時の relation 読み込みは持っていない。
- `causalRelationStore.ts` には `getRelationsByTriggerId` が未定義。

そのため、コンポーネント単体での「選択プロセスに応じた入出力復元」ができず、復元責務が親画面へ偏っている。

## 3. 要件の解釈（本設計の前提）

- トリガーIDを直接受け取る Props は現時点で存在しないため、`selected-process-id` 更新を「同期開始トリガー」とし、実際の relation 取得キーには編集中トリガーID（`triggerStore.draft.ID`）を利用する。
- 新規作成時（`draft.ID` が空）には `getRelationsByTriggerId` の評価対象がないため、自動セットは行わない（空配列維持）。
- 既存仕様の CRUD マッピングは維持する。
  - `Input` → `inputArtifacts`
  - `Create` / `Update` / `Output` → `outputArtifacts`（`Output` は後方互換として `Create` 扱い）

## 4. 変更対象（設計）

- `src/stores/causalRelationStore.ts`
- `src/components/trigger/InputOutputDefinitionComponent.vue`

※ 本フェーズでは上記ファイルを変更しない。実装フェーズで適用。

## 5. `causalRelationStore.getRelationsByTriggerId` 設計

### 5.1 複製元ロジック

複製元（現行）である `triggerStore.getRelationsByTriggerId` の挙動:

1. `triggers` から `id` 一致のトリガーを特定
2. `trigger.ProcessTypeID` を取得
3. `relations` から `ProcessTypeID` 一致行を返却
4. トリガー未発見または `ProcessTypeID` なしは `[]`

### 5.2 複製先ロジック（causalRelationStore）

`causalRelationStore` にも同じ手順を持つ getter を追加する。

想定仕様:
- 入力: `triggerId: string`
- 出力: `CausalRelationType[]`
- 返却条件:
  - 該当トリガーなし: `[]`
  - 該当トリガーあり: `relations.filter(r => r.ProcessTypeID === trigger.ProcessTypeID)`

### 5.3 複製成立のための状態要件

`causalRelationStore` 側で複製ロジックを成立させるため、以下のどちらかを採用する。

- 案A（複製忠実・推奨）  
  `causalRelationStore` に `triggers` 状態と ActionTrigger リポジトリ参照を持たせる。`fetchAll` で triggers/relations を同時ロード。
- 案B（最小追加）  
  getter 内で `useTriggerStore()` を参照し、`triggerStore.triggers` を利用する。

本設計では「ロジック複製」を重視し、**案Aを採用**する。

## 6. InputOutputDefinitionComponent 自動セット設計

### 6.1 発火条件

- `props.selectedProcessId` の変更監視（`watch`）
- 変更後値が非空、かつ `triggerStore.draft.ID` が存在

### 6.2 データ取得

1. `const triggerId = triggerStore.draft.ID`
2. `const relations = causalRelationStore.getRelationsByTriggerId(triggerId)`
3. `relations` を `inputArtifacts` / `outputArtifacts` に変換

### 6.3 変換ルール

- 入力:
  - 条件: `CrudType === 'Input'`
  - 変換: `{ id: ArtifactTypeID, name }`
- 出力:
  - 条件: `CrudType === 'Create' || CrudType === 'Update' || CrudType === 'Output'`
  - 変換: `{ id: ArtifactTypeID, name, crud }`
  - `crud` は `'Output'` を `'Create'` に正規化

`name` は `props.artifactItems` から `id` 逆引きで補完し、未解決時は空文字。

### 6.4 反映方式

- `emit('update:inputArtifacts', mappedInputs)`
- `emit('update:outputArtifacts', mappedOutputs)`

これにより単方向データフローを維持し、親 (`TriggerView`) 側配列を更新する。

## 7. 画面イベントシーケンス

1. ユーザーがプロセスを設定/変更
2. 親が `selected-process-id` を `InputOutputDefinitionComponent` へ渡す
3. コンポーネント `watch(selectedProcessId)` が発火
4. `causalRelationStore.getRelationsByTriggerId(triggerStore.draft.ID)` 実行
5. relation を入出力配列へ変換
6. `update:inputArtifacts` / `update:outputArtifacts` emit
7. 親がドラフト配列を更新し UI 再描画

## 8. エラー・境界条件

- `draft.ID` が空（新規作成）: 自動セットしない
- relation 0 件: 入出力を空配列で反映
- `artifactItems` 未ロード: `name` 空文字で反映し、後続再描画で補完
- `selectedProcessId` のみ更新され trigger ID が異なるケース: 既存仕様では編集対象トリガー単位で復元する

## 9. 受け入れ基準

1. `selected-process-id` 設定後、`InputOutputDefinitionComponent` 内で relation 取得処理が実行される。
2. relation の `CrudType` に応じて `inputArtifacts` / `outputArtifacts` が正しく更新される。
3. `causalRelationStore.getRelationsByTriggerId` は `triggerStore.getRelationsByTriggerId` と同一判定手順（トリガー特定→ProcessTypeID一致抽出）を持つ。
4. 新規作成時（トリガーIDなし）に不要な relation 読み込みを行わない。

## 10. 実装フェーズへの引き継ぎメモ

- 実装時は `TriggerView.vue` 側の既存 `onEdit` 復元処理との二重適用を避けること。
- 必要に応じて「初回のみ自動復元」フラグを持ち、同じ編集中に意図しない上書きを抑止する。
- 単体テストは以下を最低限追加する。
  - `causalRelationStore.getRelationsByTriggerId` の正常/未該当
  - `selected-process-id` 変更時の emit 値検証

---

作成日: 2026-02-15  
作成者: GitHub Copilot（設計ドラフト）
