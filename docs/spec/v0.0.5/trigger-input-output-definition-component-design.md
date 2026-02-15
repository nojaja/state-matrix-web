---
title: Trigger Tab Input/Output Definition Component - Detailed Design
version: v0.0.5
date: 2026-02-15
status: draft
---

# Trigger Tab 「プロセス・入出力定義」部品化 詳細設計

## 1. 目的

「トリガー管理」タブ内の「プロセス・入出力定義（Arrow Flow Section）」を、関連処理を含めて `InputOutputDefinitionComponent` として部品化する。

本設計は **実装前の詳細設計のみ** を対象とし、実装・コード変更は行わない。

## 2. スコープ

### 対象
- `TriggerView.vue` の Arrow Flow Section（UI）
- 同セクションに紐づく操作処理
  - プロセス選択
  - 入力作成物追加/削除
  - 出力作成物追加/削除
  - 出力CRUD（Create/Update）選択
  - 編集時の既存データ読込補助
  - 保存用 relation 配列構築

### 非対象
- `ProcessView.vue` への移設
- 永続化方式そのものの変更
- 画面仕様の追加（新モーダル、新タブ、新機能）

## 3. 現状課題

- `TriggerView.vue` がフォーム管理、モーダル制御、Arrow Flow UI、relation 変換まで一体化しており責務が過密。
- Arrow Flow の再利用性が低く、関連ロジックの保守コストが高い。
- `CausalRelationsTypes` へのマッピング仕様が画面内処理に埋め込まれており、テスト観点が分離しづらい。

## 4. 準拠データモデル（ER.md 準拠）

`docs/spec/v0.0.5/ER.md` の `CausalRelationsTypes` に準拠する。

```ts
interface CausalRelationType {
  ID: string;                // uuid
  ProcessTypeID: string;     // uuid
  ArtifactTypeID: string;    // uuid
  CrudType: string;          // 'Input' | 'Create' | 'Update' を利用
  CreateTimestamp: Date;
  LastUpdatedBy: string;
}
```

### 4.1 UI内部表現（コンポーネント入出力用）

```ts
type InputArtifactDraft = {
  id: string;   // ArtifactTypeID
  name: string;
};

type OutputArtifactDraft = {
  id: string;   // ArtifactTypeID
  name: string;
  crud: 'Create' | 'Update';
};

type RelationDraft = {
  ArtifactTypeID: string;
  CrudType: 'Input' | 'Create' | 'Update';
};
```

- 保存時は `RelationDraft[]` を `CausalRelationType` 保存処理へ受け渡す。
- `ProcessTypeID` は親（Triggerフォーム）で保持する選択プロセスIDを利用する。

## 5. コンポーネント設計

### 5.1 コンポーネント名
- `InputOutputDefinitionComponent`

### 5.2 配置（想定）
- `src/components/trigger/InputOutputDefinitionComponent.vue`

### 5.3 Props

```ts
type SelectorItem = { id: string; name: string; description?: string };

type Props = {
  selectedProcessId: string;                     // form.ProcessTypeID
  selectedProcessName?: string;                  // 表示用
  selectedProcessDescription?: string;           // 表示用
  inputArtifacts: InputArtifactDraft[];          // 双方向更新対象
  outputArtifacts: OutputArtifactDraft[];        // 双方向更新対象
  processItems: SelectorItem[];                  // プロセス選択候補
  artifactItems: SelectorItem[];                 // 作成物選択候補
  disabled?: boolean;
};
```

### 5.4 Emits

```ts
type Emits = {
  (e: 'request-open-process-selector'): void;
  (e: 'request-open-artifact-selector', mode: 'input' | 'output'): void;
  (e: 'update:inputArtifacts', value: InputArtifactDraft[]): void;
  (e: 'update:outputArtifacts', value: OutputArtifactDraft[]): void;
  (e: 'remove-artifact', payload: { index: number; mode: 'input' | 'output' }): void;
};
```

### 5.5 責務分離

#### `InputOutputDefinitionComponent` の責務
- Arrow Flow の描画
- 入出力作成物の一覧表示
- CRUDラジオの表示・変更通知
- 「追加」「削除」「設定/変更」操作イベントの通知

#### `TriggerView.vue` 側に残す責務
- モーダル表示状態管理（`showProcessSelector`, `showArtifactSelector`）
- ストア接続とデータ取得（`processStore`, `artifactStore`, `triggerStore`）
- 追加候補決定後の重複除外ロジック
- 保存時の `CausalRelationsTypes` 変換

## 6. 関連処理の設計（イベントフロー）

### 6.1 プロセス選択
1. コンポーネント内「設定/変更」押下
2. `request-open-process-selector` emit
3. 親が `SimpleSelectorModal` を開く
4. 親が選択結果で `form.ProcessTypeID` を更新
5. Props 経由でコンポーネント表示更新

### 6.2 入力作成物追加
1. コンポーネント内「+追加（入力）」押下
2. `request-open-artifact-selector('input')` emit
3. 親がモーダルで選択
4. 親で重複チェック後 `inputArtifacts` 更新
5. `update:inputArtifacts` 経由で反映（または親配列更新を再注入）

### 6.3 出力作成物追加
1. `request-open-artifact-selector('output')`
2. 親で重複チェック後 `crud: 'Create'` を初期値として追加
3. `outputArtifacts` を再描画

### 6.4 削除
- `remove-artifact` イベント（`index`, `mode`）を親へ通知
- 親で対象配列を `splice`

### 6.5 出力 CRUD 切替
- コンポーネント内のラジオ操作で `outputArtifacts[index].crud` を更新
- 値域は `'Create' | 'Update'` のみ

## 7. 保存時マッピング設計（CausalRelationsTypes 準拠）

親（TriggerView）の `onSubmit` で relation を構築する。

```ts
const relations: Array<{ ArtifactTypeID: string; CrudType: 'Input' | 'Create' | 'Update' }> = [];

inputArtifacts.forEach((a) => {
  relations.push({ ArtifactTypeID: a.id, CrudType: 'Input' });
});

outputArtifacts.forEach((a) => {
  relations.push({ ArtifactTypeID: a.id, CrudType: a.crud ?? 'Create' });
});
```

その後 `triggerStore.addTrigger(..., relations)` へ渡し、リポジトリ層で
`ProcessTypeID` を付与した `CausalRelationType` として保存する。

## 8. 編集時読込設計

`triggerStore.loadDraft(trigger, relations)` の既存仕様を維持し、以下ルールを明文化する。

- `CrudType === 'Input'` は入力配列へ
- `CrudType === 'Create' | 'Update' | 'Output'` は出力配列へ
- `'Output'` は後方互換として `'Create'` に正規化

また、表示名は親で `artifactStore.artifacts` から解決する。

## 9. バリデーション方針

### 必須
- `selectedProcessId` が空の場合、親フォームの保存不可（既存 `isValid` を維持）

### 整合
- 出力 CRUD の値は `'Create' | 'Update'` のみ許容
- relation 生成時に `ArtifactTypeID` 空値を除外

## 10. 変更対象ファイル（実装時の予定）

- `src/components/trigger/InputOutputDefinitionComponent.vue`（新規）
- `src/views/TriggerView.vue`（Arrow Flow を部品置換）
- 必要に応じて型補助:
  - `src/types/models.ts`（既存 `CausalRelationType` は維持）

## 11. テスト設計（実装後）

### Unit
- `InputOutputDefinitionComponent`
  - 入力/出力一覧表示
  - 追加/削除イベント emit
  - CRUD ラジオ更新
  - プロセス未設定表示

### Integration
- `TriggerView`
  - モーダル連携で配列更新
  - `onSubmit` が `CausalRelationsTypes` 準拠の relation を構築
  - `onEdit` 時に relation が正しく画面復元される

## 12. 受け入れ基準

1. Triggerタブで見た目・操作仕様を変えずに Arrow Flow が `InputOutputDefinitionComponent` 化されている。
2. 既存の保存結果が `CausalRelationsTypes`（`ProcessTypeID`, `ArtifactTypeID`, `CrudType`）に整合している。
3. 入力追加/出力追加/削除/CRUD切替/プロセス設定が従来どおり動作する。
4. `TriggerView.vue` から Arrow Flow の詳細UI実装が分離され、親はオーケストレーション責務に限定される。

---

以上。実装は次フェーズで行う。
