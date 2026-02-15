<template>
  <div class="space-y-6">
    <!-- Form Section -->
    <div class="bg-white p-6 rounded shadow">
      <h2 class="text-lg font-bold mb-4">トリガー管理
        <span v-if="viewTabBadge > 0" class="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-600 text-white" :aria-label="`トリガータブの競合 ${viewTabBadge} 件`" tabindex="0" @click.prevent="openFirstScopeConflict" @keydown.enter.prevent="openFirstScopeConflict" @keydown.space.prevent="openFirstScopeConflict">{{ viewTabBadge }}</span>
      </h2>
      
        <CategorySelector :path="selectedCategoryPath" @open="openCategorySelector" />

      <div class="mb-4">
        <label class="block text-sm font-medium text-gray-700">名称</label>
        <input v-model="form.Name" type="text" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" placeholder="作成物名称" />
      </div>

      <div class="mb-4">
         <label class="block text-sm font-medium text-gray-700">説明</label>
         <textarea v-model="form.Description" rows="2" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" placeholder="説明"></textarea>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
           <label class="block text-sm font-medium text-gray-700">トリガー条件</label>
           <input v-model="form.Timing" type="text" class="mt-1 block w-full border rounded p-1" placeholder="例: ファイル着信時" />
        </div>
        <div>
            <label class="block text-sm font-medium text-gray-700">担当ロール</label>
            <input v-model="form.Rollgroup" type="text" class="mt-1 block w-full border rounded p-1" placeholder="担当者1" />
        </div>
      </div>

      <InputOutputDefinitionComponent
        ref="inputOutputDefinitionRef"
        :selected-process-id="form.ProcessTypeID"
        :selected-process-name="selectedProcess?.Name ?? ''"
        :selected-process-description="selectedProcess?.Description ?? ''"
        :input-artifacts="inputArtifacts"
        :output-artifacts="outputArtifacts"
        :process-items="processItems"
        :artifact-items="artifactItems"
        :show-process-setting-button="true"
        @update:selected-process-id="onSelectedProcessIdUpdated"
        @remove-artifact="onRemoveArtifactFromComponent"
        @update:input-artifacts="onUpdateInputArtifacts"
        @update:output-artifacts="onUpdateOutputArtifacts"
      />

      <button 
        @click="onSubmit"
        class="w-full bg-purple-600 text-white py-3 rounded hover:bg-purple-700 font-bold disabled:opacity-50"
        :disabled="!isValid"
      >
        {{ isEditing ? 'トリガーを更新' : 'トリガーを追加' }}
      </button>
       <button 
        v-if="isEditing" 
        @click="resetForm"
        class="w-full mt-2 bg-gray-300 text-gray-700 py-1 rounded hover:bg-gray-400"
      >
        キャンセル
      </button>
    </div>

    <!-- List -->
    <div class="bg-white p-6 rounded shadow overflow-x-auto">
        <h3 class="text-lg font-bold mb-4">登録済トリガー一覧</h3>
        <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">トリガー名</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">カテゴリ</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">関連プロセス</th>
             <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">条件</th>
            <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr v-for="t in triggers" :key="t.ID">
             <td class="px-6 py-4 whitespace-nowrap">{{ t.Name }} <span v-if="metadataStore.conflictData?.[projectStore.selectedProject || '']?.[t.ID]" class="ml-2 text-red-600">●</span></td>
             <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ getCategoryName(t.CategoryID) }}</td>
             <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ getProcessName(t.ProcessTypeID) }}</td>
             <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ t.Timing }}</td>
             <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
               <button @click="onEdit(t)" class="text-indigo-600 hover:text-indigo-900 mr-2 bg-indigo-100 px-3 py-1 rounded-full">編集</button>
               <button v-if="metadataStore.conflictData?.[projectStore.selectedProject || '']?.[t.ID]" @click="openCompare(t.ID)" class="text-yellow-700 mr-2 bg-yellow-100 px-3 py-1 rounded-full">競合解消</button>
               <button @click="onDelete(t)" class="text-red-600 hover:text-red-900 bg-red-100 px-3 py-1 rounded-full">削除</button>
             </td>
          </tr>
          <tr v-if="triggers.length === 0">
              <td colspan="5" class="px-6 py-4 text-center text-gray-400">データがありません</td>
          </tr>
        </tbody>
        </table>
    </div>

    <!-- Modals -->
     <CategorySelectorModal v-model="showCategorySelector" @confirm="onCategorySelected" />
    <ModalDialog v-model="showCompareModal" title="競合解消">
      <ThreeWayCompareModal :keyId="compareKey || ''" />
    </ModalDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import RepositoryWorkerClient from '../lib/repositoryWorkerClient';
import { useTriggerStore } from '../stores/triggerStore';
import { useProjectStore } from '../stores/projectStore';
import { useMetadataStore } from '../stores/metadataStore';
import { useCategoryStore, type CategoryNode } from '../stores/categoryStore';
import { useProcessStore } from '../stores/processStore';
import { useArtifactStore } from '../stores/artifactStore';
import type { ActionTriggerType } from '../types/models';
import CategorySelectorModal from '../components/common/CategorySelectorModal.vue';
import CategorySelector from '../components/common/CategorySelector.vue';
import ModalDialog from '../components/common/ModalDialog.vue'
import ThreeWayCompareModal from '../components/common/ThreeWayCompareModal.vue'
import InputOutputDefinitionComponent from '../components/trigger/InputOutputDefinitionComponent.vue'

const triggerStore = useTriggerStore();
const projectStore = useProjectStore();
const metadataStore = useMetadataStore();
const categoryStore = useCategoryStore();
const processStore = useProcessStore();
const artifactStore = useArtifactStore();

const triggers = computed(() => triggerStore.triggers);

const form = triggerStore.draft as any;

// Editing state for relations is persisted in store.draft
const isEditing = computed(() => !!form.ID);
const selectedCategoryPath = computed(() => {
  return form.CategoryID ? categoryStore.getFullPath(form.CategoryID) : null;
});
const inputArtifacts = triggerStore.draft.inputArtifacts as {id: string, name: string}[];
const outputArtifacts = triggerStore.draft.outputArtifacts as {id: string, name: string, crud?: 'Create' | 'Update'}[];
const selectedProcess = computed(() => processStore.processes.find(p => p.ID === form.ProcessTypeID));

const isValid = computed(() => form.Name && form.CategoryID && form.ProcessTypeID);

// Modals
const showCategorySelector = ref(false);
const showCompareModal = ref(false)
const compareKey = ref<string | null>(null)
const route = useRoute()
type InputOutputDefinitionExposed = {
  saveCausalRelations: (params: { processTypeId: string }) => Promise<void>;
};
const inputOutputDefinitionRef = ref<InputOutputDefinitionExposed | null>(null);

const viewTabBadge = computed(() => {
  const proj = projectStore.selectedProject
  if (!proj) return 0
  const map = metadataStore.conflictData[proj] || {}
  return Object.values(map).filter((c:any) => c && c.path && c.path.startsWith('ActionTriggerTypes/')).length
})

/**
 * 処理名: 最初の競合を開く
 */
function openFirstScopeConflict() {
  const proj = projectStore.selectedProject
  if (!proj) return
  const map = metadataStore.conflictData[proj] || {}
  const firstKey = Object.keys(map).find(k => map[k] && map[k].path && map[k].path.startsWith('ActionTriggerTypes/'))
  if (firstKey) {
    compareKey.value = firstKey
    showCompareModal.value = true
  }
}

const stopConflictWatch = watch(() => route.query.conflict, (q) => {
  const v = q as string | undefined
  if (v) {
    compareKey.value = v
    showCompareModal.value = true
  }
})

onUnmounted(() => {
  stopConflictWatch()
})

/**
 *
 * @param key
 */
function openCompare(key: string) {
  compareKey.value = key
  showCompareModal.value = true
}

const processItems = computed(() => processStore.processes.map(p => ({
    id: p.ID,
    name: p.Name,
    description: p.Description
})));

const artifactItems = computed(() => artifactStore.artifacts.map(a => ({
    id: a.ID,
    name: a.Name,
    description: a.Note
})));

onMounted(() => {
   triggerStore.init();
   categoryStore.init();
   processStore.init();
   artifactStore.init();
});

/**
 * 処理名: カテゴリ名取得
 * @param id カテゴリ ID
 * @returns カテゴリ名（未解決時は ID を返す）
 */
function getCategoryName(id: string) { return categoryStore.getMap[id]?.Name ?? id; }

/**
 * 処理名: プロセス名取得
 * @param id プロセス ID
 * @returns プロセス名（未解決時は ID を返す）
 */
function getProcessName(id: string) { return processStore.processes.find(p => p.ID === id)?.Name ?? id; }

// --- Actions ---

/**
 * 処理名: カテゴリ選択モーダルを開く
 */
function openCategorySelector() { showCategorySelector.value = true; }

/**
 * 処理名: カテゴリ選択ハンドラ
 * @param node 選択された `CategoryNode`
 */
function onCategorySelected(node: CategoryNode) { form.CategoryID = node.ID; }

/**
 * 処理名: プロセス選択反映
 * @param processId 選択されたプロセスID
 */
function onSelectedProcessIdUpdated(processId: string) {
  form.ProcessTypeID = processId;
}

/**
 * 処理名: 作成物削除
 * @param idx 削除するインデックス
 * @param mode 'input' または 'output'
 */
function removeArtifact(idx: number, mode: 'input' | 'output') {
  if(mode === 'input') inputArtifacts.splice(idx, 1);
  else outputArtifacts.splice(idx, 1);
}

/**
 * 処理名: 部品からの作成物削除ハンドラ
 * @param payload 削除位置と対象モード
 * @param payload.index 削除位置
 * @param payload.mode 対象モード
 */
function onRemoveArtifactFromComponent(payload: { index: number; mode: 'input' | 'output' }) {
  removeArtifact(payload.index, payload.mode);
}

/**
 * 処理名: 入力作成物配列更新
 * @param value 更新後配列
 */
function onUpdateInputArtifacts(value: { id: string; name: string }[]) {
  inputArtifacts.splice(0, inputArtifacts.length, ...value);
}

/**
 * 処理名: 出力作成物配列更新
 * @param value 更新後配列
 */
function onUpdateOutputArtifacts(value: { id: string; name: string; crud?: 'Create' | 'Update' }[]) {
  outputArtifacts.splice(0, outputArtifacts.length, ...value);
}

// --- Submit / Load ---

/**
 * 処理名: 送信処理
 *
 * 処理概要: トリガーと関連を構築して永続化する
 */
async function onSubmit() {
    if(!isValid.value) return;
    let saved: { triggerId: string; processTypeId: string } | null = null;

    if(isEditing.value) {
        // Edit mode logic: Remove and Re-Add for simplicity in this prototype
        await triggerStore.removeTrigger(form.ID);
        saved = await triggerStore.addTrigger({
            Name: form.Name,
            Description: form.Description,
            CategoryID: form.CategoryID,
            ProcessTypeID: form.ProcessTypeID,
            Rollgroup: form.Rollgroup,
            Timing: form.Timing,
            TimingDetail: form.TimingDetail,
            ActionType: form.ActionType
        });
        
    } else {
        saved = await triggerStore.addTrigger({
            Name: form.Name,
            Description: form.Description,
            CategoryID: form.CategoryID,
            ProcessTypeID: form.ProcessTypeID,
            Rollgroup: form.Rollgroup,
            Timing: form.Timing,
            TimingDetail: form.TimingDetail,
            ActionType: 0
        });
    }

    if (saved?.processTypeId && inputOutputDefinitionRef.value) {
      await inputOutputDefinitionRef.value.saveCausalRelations({
        processTypeId: saved.processTypeId
      });
    }
    
    resetForm();

    // Post-save: attempt push then remove/sync
    await handlePostSave(projectStore.selectedProject, isEditing.value ? form.ID : null, 'TriggerView')
}

/**
 * 同期後処理
 * @param project - プロジェクト名
 * @param conflictId - 競合ID
 * @param logPrefix - ログ接頭辞
 */
async function handlePostSave(project: string | null, conflictId: string | null, logPrefix: string) {
  try {
    if (!project) {
      console.info('プロジェクトが未選択のため同期をスキップしました')
      return
    }
    if (!conflictId) return

    console.info(`同期後処理開始: project=${project} id=${conflictId}`)
    const entry = await metadataStore.getConflictFor(project, conflictId)
    if (!entry) return

    const cfg = await metadataStore.getRepoConfig(project)
    if (entry.path && cfg) {
      const localText = await readLocalText(project, entry.path, logPrefix)
      const pushed = await tryPushSingleFile(cfg, entry.path, localText)
      if (pushed) {
        await removeConflictAndLog(project, conflictId)
        console.info(`プッシュ成功・競合削除: id=${conflictId}`)
        return
      }
    }

    await removeConflictAndLog(project, conflictId)
    await syncProjectAndLog(project)
  } catch (e) {
    console.error('同期後処理で予期せぬエラー', e)
  }
}

/**
 * ローカルテキストを取得
 * @param project - プロジェクト名
 * @param path - パス
 * @param logPrefix - ログ接頭辞
 * @returns ローカルテキスト
 */
async function readLocalText(project: string, path: string, logPrefix: string): Promise<string | null> {
  try {
    const projHandle = await metadataStore.getProjectDirHandle(project)
    const fh = await projHandle.getFileHandle(path)
    return await (await fh.getFile()).text()
  } catch (e) {
    console.warn(`[${logPrefix}] file not found:`, e)
    return null
  }
}

/**
 * 1ファイルpush
 * @param cfg - リポ設定
 * @param path - パス
 * @param content - コンテンツ
 * @returns push成功ならtrue
 */
async function tryPushSingleFile(cfg: any, path: string, content: string | null): Promise<boolean> {
  if (content == null) return false
  try {
    const client = new RepositoryWorkerClient()
    const pushRes = await client.pushPathsToRemote(cfg, [{ path, content }])
    return Array.isArray(pushRes) && pushRes.every(r => r.ok)
  } catch (e) {
    console.error('pushPathsToRemote でエラー、syncProject にフォールバックします', e)
    return false
  }
}

/**
 * 競合削除
 * @param project - プロジェクト名
 * @param conflictId - 競合ID
 */
async function removeConflictAndLog(project: string, conflictId: string) {
  try {
    await metadataStore.removeConflict(project, conflictId)
    console.info(`競合削除成功: id=${conflictId}`)
  } catch (err) {
    console.error(`競合削除失敗: id=${conflictId}`, err)
  }
}

/**
 * 同期実行
 * @param project - プロジェクト名
 */
async function syncProjectAndLog(project: string) {
  try {
    await metadataStore.syncProject(project)
    console.info(`同期成功: project=${project}`)
  } catch (err) {
    console.error(`同期失敗: project=${project}`, err)
  }
}

/**
 * 処理名: 編集開始
 * @param t 編集対象の `ActionTriggerType`
 */
function onEdit(t: ActionTriggerType) {
    form.ID = t.ID;
    form.Name = t.Name;
    form.Description = t.Description;
    form.CategoryID = t.CategoryID;
    form.ProcessTypeID = t.ProcessTypeID;
    form.Rollgroup = t.Rollgroup;
    form.Timing = t.Timing;
    form.TimingDetail = t.TimingDetail;
    form.ActionType = t.ActionType;
}

/**
 * 処理名: 削除
 * @param t 削除対象の `ActionTriggerType`
 */
async function onDelete(t: ActionTriggerType) {
    if(confirm('削除しますか？')) {
        await triggerStore.removeTrigger(t.ID);
        if(form.ID === t.ID) resetForm();
    }
}

/**
 * 処理名: フォームリセット
 *
 * 処理概要: フォームと一時編集状態を初期化する
 */
function resetForm() {
    triggerStore.resetDraft();
}

// 競合解決ハンドラは未使用のため削除
</script>
