---
title: Trigger Submit Store Split Design
version: v0.0.5
date: 2026-02-15
status: draft
---

# Trigger Submit Store Split Design（詳細設計）

## 1. 目的

`TriggerView` の `onSubmit` における保存責務を分離し、以下を実現する。

- `triggerStore.addTrigger` は `ActionTriggerType` の保存のみに限定する
- `CausalRelationType` の保存は新設 `causalRelationStore.addCausalRelation` が担当する
- `TriggerView.onSubmit` 実行時に `InputOutputDefinitionComponent` 側メソッドを呼び、同コンポーネント経由で `causalRelationStore.addCausalRelation` を実行する

本書は **設計のみ** を対象とし、実装は行わない。

## 2. 背景（現状）

現状の `triggerStore.addTrigger` は以下を1メソッドで実行している。

1. `ActionTriggerType` の保存
2. `relationsPartial` から `CausalRelationType` を生成し保存

この構成では責務が混在し、UI部品側（`InputOutputDefinitionComponent`）の再利用単位が曖昧になっている。

## 3. スコープ

### 3.1 対象
- `triggerStore.addTrigger` の責務分離
- `causalRelationStore` 新設と `addCausalRelation` 実装設計
- `TriggerView.onSubmit` から `InputOutputDefinitionComponent` の公開メソッド呼び出し設計
- `InputOutputDefinitionComponent` 内で `causalRelationStore.addCausalRelation` を実行する設計

### 3.2 非対象
- データモデル（ER定義）の変更
- リポジトリファイル形式の変更
- Trigger/Process 画面のUX変更
- 既存 `CausalRelationType` スキーマ拡張

## 4. 設計方針

### 4.1 責務分離
- `triggerStore`
  - `ActionTriggerType` のCRUDのみ
- `causalRelationStore`（新設）
  - `CausalRelationType` のCRUDのみ
- `InputOutputDefinitionComponent`
  - 画面内編集済み I/O 定義を `CausalRelationType` 相当に変換し、`causalRelationStore` へ保存要求を行う

### 4.2 呼び出し責務
- `TriggerView.onSubmit`
  1. `triggerStore.addTrigger` を呼ぶ（ActionTriggerTypeのみ保存）
  2. 保存結果（`triggerId`, `processTypeId`）を使い `InputOutputDefinitionComponent` の公開メソッドを呼ぶ
  3. `InputOutputDefinitionComponent` 公開メソッドが `causalRelationStore.addCausalRelation` を必要件数実行

## 5. データ契約

### 5.1 triggerStore.addTrigger

#### 変更前
- 引数: `triggerPartial`, `relationsPartial`
- 挙動: Trigger と Relation を両方保存

#### 変更後
- 引数: `triggerPartial` のみ
- 戻り値: `Promise<{ triggerId: string; processTypeId: string }>`（または同等情報）
- 挙動: `ActionTriggerType` のみ保存

### 5.2 causalRelationStore.addCausalRelation（新設）

```ts
type AddCausalRelationInput = Omit<
  CausalRelationType,
  'ID' | 'CreateTimestamp' | 'LastUpdatedBy'
>;

addCausalRelation(input: AddCausalRelationInput): Promise<void>
```

補助メソッド（必要に応じて）:
- `addCausalRelations(inputs: AddCausalRelationInput[]): Promise<void>`
- `removeByProcessTypeId(processTypeId: string): Promise<void>`

## 6. InputOutputDefinitionComponent 公開メソッド設計

`TriggerView` から `ref` 経由で呼べる公開メソッドを提供する。

```ts
saveCausalRelations(params: {
  processTypeId: string;
  triggerId: string;
}): Promise<void>
```

### メソッド内部処理
1. コンポーネント内の `inputArtifacts`, `outputArtifacts` を参照
2. `CrudType` を以下で確定
   - input -> `Input`
   - output -> `Create` / `Update`
3. `processTypeId` を付与し `causalRelationStore.addCausalRelation` を件数分呼ぶ
4. 重複がある場合は保存前に除外

## 7. TriggerView onSubmit シーケンス

1. `isValid` チェック
2. `triggerStore.addTrigger(triggerPayload)` 実行
3. 返却された `processTypeId`（および必要なら `triggerId`）を取得
4. `inputOutputDefinitionRef.value.saveCausalRelations(...)` を await
5. 成功後 `resetForm` 実行
6. 同期後処理（既存 `handlePostSave`）

失敗時:
- Trigger保存失敗: Relation保存は実行しない
- Relation保存失敗: エラー通知し、再実行可能状態を維持

## 8. UIコンポーネント間インターフェース

### 8.1 TriggerView
- `ref` を `InputOutputDefinitionComponent` に付与
- `onSubmit` で公開メソッドを呼ぶ

### 8.2 InputOutputDefinitionComponent
- `defineExpose({ saveCausalRelations })` を提供
- 内部で `causalRelationStore` を利用

## 9. 状態管理設計

### 9.1 triggerStore
- `relations` 状態は段階的に `causalRelationStore` に移譲
- 移行後は `getRelationsByTriggerId` の責務見直し（必要なら `causalRelationStore` 側 getter 化）

### 9.2 causalRelationStore（新設）
- state
  - `relations: CausalRelationType[]`
  - `loading: boolean`
  - `initialized: boolean`
- actions
  - `initFromVirtualFS`
  - `fetchAll`
  - `addCausalRelation`
  - `updateCausalRelation`
  - `removeCausalRelation`

## 10. 互換性と移行方針

- 既存 `triggerStore.addTrigger(trigger, relations)` 呼び出し箇所は段階的に改修
- 改修期間中は互換シグネチャを一時保持する選択肢を認める
  - ただし最終的には `relations` 引数を削除

## 11. テスト設計（t_wada TDD 前提）

### 11.1 Red
- `triggerStore.addTrigger` が `ActionTriggerType` のみ保存することを失敗テストで定義
- `causalRelationStore.addCausalRelation` が `CausalRelationType` を保存することを失敗テストで定義
- `TriggerView.onSubmit` が
  - `triggerStore.addTrigger`
  - `InputOutputDefinitionComponent.saveCausalRelations`
  の順で呼ぶことを失敗テストで定義

### 11.2 Green
- 最小実装で Red テストを通す

### 11.3 Refactor
- 共通変換ロジック（I/O -> CausalRelation）を関数化
- 重複したモックセットアップをヘルパー化

## 12. 受け入れ基準

1. `triggerStore.addTrigger` は `ActionTriggerType` 保存のみ行う
2. `CausalRelationType` 保存は `causalRelationStore.addCausalRelation` のみが行う
3. `TriggerView.onSubmit` 実行時、`InputOutputDefinitionComponent` 公開メソッド経由で Relation 保存が走る
4. 既存UIで入力/出力追加・CRUD切替・保存が維持される
5. ユニットテストで保存責務分離が検証される

## 13. 変更対象ファイル（実装時予定）

- `src/stores/triggerStore.ts`（addTrigger責務分離）
- `src/stores/causalRelationStore.ts`（新規）
- `src/components/trigger/InputOutputDefinitionComponent.vue`（公開メソッド + store呼び出し）
- `src/views/TriggerView.vue`（onSubmitから部品メソッド呼び出し）
- `test/unit/behavior/v0.0.5/stores/*`（storeテスト）
- `test/unit/behavior/v0.0.5/views/*`（onSubmit連携テスト）

---

以上。実装は次フェーズで実施する。
