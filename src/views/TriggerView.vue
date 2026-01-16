<template>
  <div class="space-y-6">
    <!-- Form Section -->
    <div class="bg-white p-6 rounded shadow">
      <h2 class="text-lg font-bold mb-4">トリガー管理</h2>
      
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

      <!-- Arrow Flow Section -->
      <div class="border-t pt-4 mt-4">
         <h3 class="text-md font-semibold mb-2">プロセス・入出力定義</h3>
         <div class="flex flex-col md:flex-row items-stretch gap-2 overflow-x-auto p-2 bg-gray-50 rounded">
            
            <!-- Input Artifacts -->
            <div class="flex-1 bg-white border rounded p-2 min-w-[200px] flex flex-col">
               <div class="font-bold text-center bg-gray-200 py-1 mb-2 rounded">インプット作成物</div>
               <div class="flex-1 space-y-2">
                  <div v-for="(art, idx) in inputArtifacts" :key="idx" class="flex justify-between items-center border p-1 rounded">
                     <span class="truncate text-sm" :title="art.name">{{ art.name }}</span>
                     <button @click="removeArtifact(idx, 'input')" class="text-red-500 hover:bg-red-50 rounded">
                        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                     </button>
                  </div>
               </div>
               <button @click="openArtifactSelector('input')" class="mt-2 w-full py-1 border-2 border-dashed border-gray-300 text-gray-500 rounded hover:border-gray-400 hover:text-gray-600">
                  + 追加
               </button>
            </div>

            <!-- Arrow -->
            <div class="flex items-center justify-center">
                 <svg class="h-8 w-8 text-gray-400 transform rotate-90 md:rotate-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                 </svg>
            </div>

            <!-- Process -->
            <div class="flex-1 bg-blue-50 border border-blue-200 rounded p-2 min-w-[200px] flex flex-col items-center justify-center">
               <div class="font-bold text-center mb-2">プロセス</div>
               <div v-if="selectedProcess" class="bg-white border p-3 rounded shadow-sm w-full text-center">
                  <div class="font-bold text-blue-800">{{ selectedProcess.Name }}</div>
                  <div class="text-xs text-gray-500 truncate">{{ selectedProcess.Description }}</div>
               </div>
               <div v-else class="text-gray-400 text-sm">未設定</div>
               <button @click="openProcessSelector" class="mt-2 text-sm text-blue-600 underline">
                  {{ selectedProcess ? '変更' : '設定' }}
               </button>
            </div>

            <!-- Arrow -->
            <div class="flex items-center justify-center">
                 <svg class="h-8 w-8 text-gray-400 transform rotate-90 md:rotate-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                 </svg>
            </div>

             <!-- Output Artifacts -->
            <div class="flex-1 bg-white border rounded p-2 min-w-[200px] flex flex-col">
               <div class="font-bold text-center bg-gray-200 py-1 mb-2 rounded">アウトプット作成物</div>
               <div class="flex-1 space-y-2">
                  <div v-for="(art, idx) in outputArtifacts" :key="idx" class="flex justify-between items-center border p-1 rounded">
                     <span class="truncate text-sm" :title="art.name">{{ art.name }}</span>
                     <button @click="removeArtifact(idx, 'output')" class="text-red-500 hover:bg-red-50 rounded">
                        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                     </button>
                  </div>
               </div>
               <button @click="openArtifactSelector('output')" class="mt-2 w-full py-1 border-2 border-dashed border-gray-300 text-gray-500 rounded hover:border-gray-400 hover:text-gray-600">
                  + 追加
               </button>
            </div>

         </div>
      </div>

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
             <td class="px-6 py-4 whitespace-nowrap">{{ t.Name }}</td>
             <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ getCategoryName(t.CategoryID) }}</td>
             <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ getProcessName(t.ProcessTypeID) }}</td>
             <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ t.Timing }}</td>
             <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
               <button @click="onEdit(t)" class="text-indigo-600 hover:text-indigo-900 mr-2 bg-indigo-100 px-3 py-1 rounded-full">編集</button>
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
    <SimpleSelectorModal 
       v-model="showProcessSelector" 
       title="プロセス選択" 
       :items="processItems" 
       @confirm="onProcessSelected" 
    />
     <SimpleSelectorModal 
       v-model="showArtifactSelector" 
       title="作成物選択" 
       :items="artifactItems" 
       @confirm="onArtifactSelected" 
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useTriggerStore } from '../stores/triggerStore';
import { useCategoryStore, type CategoryNode } from '../stores/categoryStore';
import { useProcessStore } from '../stores/processStore';
import { useArtifactStore } from '../stores/artifactStore';
import type { ActionTriggerType, CausalRelationType } from '../types/models';
import CategorySelectorModal from '../components/common/CategorySelectorModal.vue';
import CategorySelector from '../components/common/CategorySelector.vue';
import SimpleSelectorModal from '../components/common/SimpleSelectorModal.vue';

const triggerStore = useTriggerStore();
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
const outputArtifacts = triggerStore.draft.outputArtifacts as {id: string, name: string}[];
const selectedProcess = computed(() => processStore.processes.find(p => p.ID === form.ProcessTypeID));

const isValid = computed(() => form.Name && form.CategoryID && form.ProcessTypeID);

// Modals
const showCategorySelector = ref(false);
const showProcessSelector = ref(false);
const showArtifactSelector = ref(false);
const artifactSelectorMode = ref<'input' | 'output'>('input');

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
 * 処理名: プロセス選択モーダルを開く
 */
function openProcessSelector() { showProcessSelector.value = true; }

/**
 * 処理名: プロセス選択ハンドラ
 * @param item 選択された項目 `{ id: string }`
 */
/**
 * 処理名: プロセス選択ハンドラ
 * @param item 選択された項目 `{ id: string }`
 * @param item.id 選択されたプロセスの ID
 */
function onProcessSelected(item: {id: string}) { form.ProcessTypeID = item.id; }

/**
 * 処理名: 作成物選択モーダルを開く
 * @param mode 'input' か 'output'
 */
function openArtifactSelector(mode: 'input' | 'output') {
    artifactSelectorMode.value = mode;
    showArtifactSelector.value = true;
}

/**
 * 処理名: 作成物選択ハンドラ
 * @param item 選択された項目 `{ id: string, name: string }`
 * @param item.id 選択された作成物の ID
 * @param item.name 選択された作成物の表示名
 */
function onArtifactSelected(item: {id: string, name: string}) {
  if(artifactSelectorMode.value === 'input') {
    if(!inputArtifacts.some(a => a.id === item.id)) {
      inputArtifacts.push({ id: item.id, name: item.name });
    }
  } else {
    if(!outputArtifacts.some(a => a.id === item.id)) {
      outputArtifacts.push({ id: item.id, name: item.name });
    }
  }
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

// --- Submit / Load ---

/**
 * 処理名: 送信処理
 *
 * 処理概要: トリガーと関連を構築して永続化する
 */
async function onSubmit() {
    if(!isValid.value) return;

    // Relations construction
    const relations: Omit<CausalRelationType, 'ID' | 'ActionTriggerTypeID' | 'CreateTimestamp' | 'LastUpdatedBy'>[] = [];
    inputArtifacts.forEach((a) => {
      relations.push({ ArtifactTypeID: a.id, CrudType: 'Input' });
    });
    outputArtifacts.forEach((a) => {
      relations.push({ ArtifactTypeID: a.id, CrudType: 'Output' });
    });

    if(isEditing.value) {
        // Edit mode logic: Remove and Re-Add for simplicity in this prototype
        await triggerStore.removeTrigger(form.ID);
        await triggerStore.addTrigger({
            Name: form.Name,
            Description: form.Description,
            CategoryID: form.CategoryID,
            ProcessTypeID: form.ProcessTypeID,
            Rollgroup: form.Rollgroup,
            Timing: form.Timing,
            TimingDetail: form.TimingDetail,
            ActionType: form.ActionType
        }, relations);
        
    } else {
        await triggerStore.addTrigger({
            Name: form.Name,
            Description: form.Description,
            CategoryID: form.CategoryID,
            ProcessTypeID: form.ProcessTypeID,
            Rollgroup: form.Rollgroup,
            Timing: form.Timing,
            TimingDetail: form.TimingDetail,
            ActionType: 0
        }, relations);
    }
    
    resetForm();
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
    
    // Load relations into draft and resolve names
    const rels = triggerStore.getRelationsByTriggerId(t.ID);
    triggerStore.loadDraft(t, rels as CausalRelationType[]);
    // Resolve artifact names from artifactStore
    triggerStore.draft.inputArtifacts = inputArtifacts.map((a) => ({ id: a.id, name: artifactStore.artifacts.find(x => x.ID === a.id)?.Name ?? 'Unknown' }));
    triggerStore.draft.outputArtifacts = outputArtifacts.map((a) => ({ id: a.id, name: artifactStore.artifacts.find(x => x.ID === a.id)?.Name ?? 'Unknown' }));
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
</script>
