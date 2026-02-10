<template>
  <div class="space-y-6">
    <!-- Form Section -->
    <div class="bg-white p-6 rounded shadow">
      <h2 class="text-lg font-bold mb-4">プロセス管理
        <span v-if="viewTabBadge > 0" class="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-600 text-white" :aria-label="`プロセスタブの競合 ${viewTabBadge} 件`" tabindex="0" @click.prevent="openFirstScopeConflict" @keydown.enter.prevent="openFirstScopeConflict" @keydown.space.prevent="openFirstScopeConflict">{{ viewTabBadge }}</span>
      </h2>
      
      <!-- Category Selector -->
      <div class="mb-4">
        <label class="block text-sm font-medium text-gray-700">カテゴリ : </label>
        <div class="mt-1 flex items-center">
          <button 
            @click="openCategorySelector"
            class="text-blue-600 hover:underline flex items-center"
          >
            <span v-if="selectedCategoryPath">{{ selectedCategoryPath }}</span>
            <span v-else class="text-gray-400">（カテゴリを選択してください）</span>
          </button>
        </div>
        </div>
        <div class="mb-4">
        <label class="block text-sm font-medium text-gray-700">工程名称</label>
        <input v-model="form.Name" type="text" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" placeholder="プロセス名称" />
      </div>

      <div class="mb-4">
        <label class="block text-sm font-medium text-gray-700">説明</label>
        <textarea v-model="form.Description" rows="3" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" placeholder="プロセスの説明"></textarea>
      </div>

      <button 
        @click="onSubmit"
        class="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 font-bold disabled:opacity-50"
        :disabled="!isValid"
      >
        {{ isEditing ? 'プロセスを更新' : 'プロセスを追加' }}
      </button>
      <button 
        v-if="isEditing" 
        @click="resetForm"
        class="w-full mt-2 bg-gray-300 text-gray-700 py-1 rounded hover:bg-gray-400"
      >
        キャンセル
      </button>
    </div>

    <!-- List Section -->
    <div class="bg-white p-6 rounded shadow">
      <h3 class="text-lg font-bold mb-4">登録済プロセス一覧</h3>
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">工程名</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">カテゴリ</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">説明</th>
            <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr v-for="proc in processes" :key="proc.ID">
            <td class="px-6 py-4 whitespace-nowrap">
              {{ proc.Name }}
              <span v-if="projectStore.conflictData?.[projectStore.selectedProject || '']?.[proc.ID]" class="ml-2 text-red-600">●</span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                 {{ getCategoryName(proc.CategoryID) }}
            </td>
            <td class="px-6 py-4 text-sm text-gray-500">{{ proc.Description }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
              <button @click="onEdit(proc)" class="text-indigo-600 hover:text-indigo-900 mr-2 bg-indigo-100 px-3 py-1 rounded-full">編集</button>
              <button v-if="projectStore.conflictData?.[projectStore.selectedProject || '']?.[proc.ID]" @click="openCompare(proc.ID)" class="text-yellow-700 mr-2 bg-yellow-100 px-3 py-1 rounded-full">競合解消</button>
              <button @click="onDelete(proc)" class="text-red-600 hover:text-red-900 bg-red-100 px-3 py-1 rounded-full">削除</button>
            </td>
          </tr>
          <tr v-if="processes.length === 0">
              <td colspan="4" class="px-6 py-4 text-center text-gray-400">データがありません</td>
          </tr>
        </tbody>
      </table>
    </div>

    <CategorySelectorModal v-model="showCategorySelector" @confirm="onCategorySelected" />
    <ModalDialog v-model="showCompareModal" title="競合解消">
      <ThreeWayCompareModal :keyId="compareKey || ''" />
    </ModalDialog>

      <!-- Inline conflict field resolver for process edits -->
      <div v-if="isEditing && projectStore.conflictData?.[projectStore.selectedProject || '']?.[form.ID]" class="mb-4 bg-yellow-50 p-3 rounded">
        <ConflictFields :keyId="form.ID" />
      </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import RepositoryWorkerClient from '../lib/repositoryWorkerClient';
import { useProcessStore } from '../stores/processStore';
import { useCategoryStore, type CategoryNode } from '../stores/categoryStore';
import { useProjectStore } from '../stores/projectStore';
import type { ProcessType } from '../types/models';
import CategorySelectorModal from '../components/common/CategorySelectorModal.vue';
import ModalDialog from '../components/common/ModalDialog.vue'
import ThreeWayCompareModal from '../components/common/ThreeWayCompareModal.vue'
import ConflictFields from '../components/common/ConflictFields.vue'

const processStore = useProcessStore();
const categoryStore = useCategoryStore();
const projectStore = useProjectStore();

const processes = computed(() => processStore.processes);
const categoryMap = computed(() => categoryStore.getMap);

const form = processStore.draft as any;

const isEditing = computed(() => !!form.ID);
const selectedCategoryPath = computed(() => {
  return form.CategoryID ? categoryStore.getFullPath(form.CategoryID) : null;
});
const isValid = computed(() => form.Name && form.CategoryID);

const showCategorySelector = ref(false);
const showCompareModal = ref(false)
const compareKey = ref<string | null>(null)
const route = useRoute()

const viewTabBadge = computed(() => {
  const proj = projectStore.selectedProject
  if (!proj) return 0
  const map = projectStore.conflictData[proj] || {}
  return Object.values(map).filter((c:any) => c && c.path && c.path.startsWith('ProcessTypes/')).length
})

function openFirstScopeConflict() {
  const proj = projectStore.selectedProject
  if (!proj) return
  const map = projectStore.conflictData[proj] || {}
  const firstKey = Object.keys(map).find(k => map[k] && map[k].path && map[k].path.startsWith('ProcessTypes/'))
  if (firstKey) {
    compareKey.value = firstKey
    showCompareModal.value = true
  }
}

watch(() => route.query.conflict, (q) => {
  const v = q as string | undefined
  if (v) {
    compareKey.value = v
    showCompareModal.value = true
  }
})

/**
 *
 * @param key
 */
function openCompare(key: string) {
  compareKey.value = key
  showCompareModal.value = true
}

onMounted(() => {
  processStore.init();
  categoryStore.init();
});

/**
 * 処理名: カテゴリ名取得
 * @param id カテゴリ ID
 * @returns string カテゴリ名（未解決時は ID を返す）
 *
 * 処理概要: ID からカテゴリ名を返す（未解決時は ID を返す）
 */
function getCategoryName(id: string) {
  return categoryMap.value[id]?.Name || id;
}

/**
 * 処理名: カテゴリ選択モーダルを開く
 *
 * 処理概要: カテゴリ選択用モーダルを表示する
 */
function openCategorySelector() {
  showCategorySelector.value = true;
}

/**
 * 処理名: カテゴリ選択ハンドラ
 * @param node 選択された `CategoryNode`
 *
 * 処理概要: フォームに選択カテゴリを設定する
 */
function onCategorySelected(node: CategoryNode) {
  processStore.setDraft({ CategoryID: node.ID });
}

/**
 * 処理名: 編集開始
 * @param proc 編集対象の `ProcessType`
 *
 * 処理概要: フォームを編集対象の値で初期化する
 */
function onEdit(proc: ProcessType) {
  processStore.loadDraft(proc);
}

/**
 * 処理名: 削除
 * @param proc 削除対象の `ProcessType`
 *
 * 処理概要: 確認後にプロセスを削除しフォームをリセットする
 */
async function onDelete(proc: ProcessType) {
  if(confirm(`プロセス「${proc.Name}」を削除しますか？`)) {
    await processStore.remove(proc.ID);
    if(form.ID === proc.ID) resetForm();
  }
}

/**
 * 処理名: フォーム送信
 *
 * 処理概要: 新規作成または更新を判定して永続化し、フォームをリセットする
 */
async function onSubmit() {
  if(!isValid.value) return;

  if (isEditing.value) {
    // Update
    const target = processStore.processes.find(p => p.ID === form.ID);
    if(target) {
      await processStore.update({
        ...target,
        Name: form.Name,
        Description: form.Description,
        CategoryID: form.CategoryID
      });
    }
  } else {
    // Add
    await processStore.add({
      Name: form.Name,
      Description: form.Description,
      CategoryID: form.CategoryID
    });
  }
  resetForm();

  // Post-save: remove conflict and sync
  try {
    const proj = projectStore.selectedProject
    const idForLog = isEditing.value && form.ID ? form.ID : 'new'
    console.info(`同期後処理開始: project=${proj} id=${idForLog}`)
    if (proj) {
      // Attempt to push resolved path if conflict entry has a path
      try {
        if (isEditing.value && form.ID) {
          const entry = await projectStore.getConflictFor(proj, form.ID)
          const cfg = await projectStore.getRepoConfig(proj)
          if (entry && entry.path && cfg) {
            try {
              const client = new RepositoryWorkerClient()
              // read local content
              const projHandle = await projectStore.getProjectDirHandle(proj)
              let localText: string | null = null
              try {
                const fh = await projHandle.getFileHandle(entry.path)
                localText = await (await fh.getFile()).text()
              } catch (_e) {
                localText = null
              }
              if (localText != null) {
                const pushRes = await client.pushPathsToRemote(cfg, [{ path: entry.path, content: localText }])
                if (Array.isArray(pushRes) && pushRes.every(r => r.ok)) {
                  // push succeeded -> remove conflict and return
                  await projectStore.removeConflict(form.ID)
                  console.info(`プッシュ成功・競合削除: id=${form.ID}`)
                  return
                }
              }
            } catch (e) {
              console.error('pushPathsToRemote でエラー、syncProject にフォールバックします', e)
            }
          }
          // fallback: remove conflict then sync
          try {
            await projectStore.removeConflict(form.ID)
            console.info(`競合削除成功: id=${form.ID}`)
          } catch (err) {
            console.error(`競合削除失敗: id=${form.ID}`, err)
          }
        }
      } catch (err) {
        console.error('競合処理中にエラー', err)
      }
      try {
        await projectStore.syncProject(proj)
        console.info(`同期成功: project=${proj}`)
      } catch (err) {
        console.error(`同期失敗: project=${proj}`, err)
      }
    } else {
      console.info('プロジェクトが未選択のため同期をスキップしました')
    }
  } catch (e) {
    console.error('同期後処理で予期せぬエラー', e)
  }
}

/**
 * 処理名: フォームリセット
 *
 * 処理概要: フォームを初期状態に戻す
 */
function resetForm() {
  processStore.resetDraft();
}

// 競合解決ハンドラは未使用のため削除
</script>
