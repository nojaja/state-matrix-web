<template>
  <div class="space-y-6">
    <!-- Form Section -->
    <div class="bg-white p-6 rounded shadow">
      <h2 class="text-lg font-bold mb-4">作成物管理
      <span v-if="viewTabBadge > 0" class="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-600 text-white" :aria-label="`アーティファクトタブの競合 ${viewTabBadge} 件`" tabindex="0" @click.prevent="openFirstScopeConflict" @keydown.enter.prevent="openFirstScopeConflict" @keydown.space.prevent="openFirstScopeConflict">{{ viewTabBadge }}</span>
      </h2>
      
      <CategorySelector :path="selectedCategoryPath" @open="openCategorySelector" />

      <div class="mb-4">
        <label class="block text-sm font-medium text-gray-700">名称</label>
        <input v-model="form.Name" type="text" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" placeholder="作成物名称" />
      </div>

      <div class="mb-4">
        <label class="block text-sm font-medium text-gray-700">内容</label>
        <textarea v-model="form.Content" rows="2" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" placeholder="作成物の内容"></textarea>
      </div>

      <div class="mb-4">
        <label class="block text-sm font-medium text-gray-700">備考</label>
        <textarea v-model="form.Note" rows="2" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" placeholder="備考"></textarea>
      </div>

      <button 
        @click="onSubmit"
        class="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 font-bold disabled:opacity-50"
        :disabled="!isValid"
      >
        {{ isEditing ? '作成物を更新' : '作成物を追加' }}
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
      <h3 class="text-lg font-bold mb-4">登録済作成物一覧</h3>
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">名称</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">カテゴリ</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">内容</th>
             <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">備考</th>
            <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr v-for="item in artifacts" :key="item.ID">
            <td class="px-6 py-4 whitespace-nowrap">{{ item.Name }} <span v-if="metadataStore.conflictData?.[projectStore.selectedProject || '']?.[item.ID]" class="ml-2 text-red-600">●</span></td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                 {{ getCategoryName(item.CategoryID) }}
            </td>
            <td class="px-6 py-4 text-sm text-gray-500 truncate max-w-xs">{{ item.Content }}</td>
            <td class="px-6 py-4 text-sm text-gray-500 truncate max-w-xs">{{ item.Note }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
              <button @click="onEdit(item)" class="text-indigo-600 hover:text-indigo-900 mr-2 bg-indigo-100 px-3 py-1 rounded-full">編集</button>
              <button v-if="metadataStore.conflictData?.[projectStore.selectedProject || '']?.[item.ID]" @click="openCompare(item.ID)" class="text-yellow-700 mr-2 bg-yellow-100 px-3 py-1 rounded-full">競合解消</button>
              <button @click="onDelete(item)" class="text-red-600 hover:text-red-900 bg-red-100 px-3 py-1 rounded-full">削除</button>
            </td>
          </tr>
          <tr v-if="artifacts.length === 0">
              <td colspan="5" class="px-6 py-4 text-center text-gray-400">データがありません</td>
          </tr>
        </tbody>
      </table>
    </div>

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
import { useArtifactStore } from '../stores/artifactStore';
import { useProjectStore } from '../stores/projectStore';
import { useMetadataStore } from '../stores/metadataStore';
import { useCategoryStore } from '../stores/categoryStore';
import { useCategorySelector } from '../composables/useCategorySelector';
import type { ArtifactType } from '../types/models';
import CategorySelectorModal from '../components/common/CategorySelectorModal.vue';
import CategorySelector from '../components/common/CategorySelector.vue';
import ModalDialog from '../components/common/ModalDialog.vue'
import ThreeWayCompareModal from '../components/common/ThreeWayCompareModal.vue'

const artifactStore = useArtifactStore();
const projectStore = useProjectStore();
const metadataStore = useMetadataStore();
const categoryStore = useCategoryStore();

const artifacts = computed(() => artifactStore.artifacts);
const categoryMap = computed(() => categoryStore.getMap);

const form = artifactStore.draft as any;

const isEditing = computed(() => !!form.ID);
const {
  showCategorySelector,
  selectedCategoryPath,
  openCategorySelector,
  onCategorySelected
} = useCategorySelector({
  categoryId: () => form.CategoryID,
  getFullPath: (categoryId: string) => categoryStore.getFullPath(categoryId),
  applyCategoryId: (categoryId: string) => {
    artifactStore.setDraft({ CategoryID: categoryId });
  }
});
const isValid = computed(() => form.Name && form.CategoryID);

const showCompareModal = ref(false)
const compareKey = ref<string | null>(null)
const route = useRoute()

const viewTabBadge = computed(() => {
  const proj = projectStore.selectedProject
  if (!proj) return 0
  const map = metadataStore.conflictData[proj] || {}
  return Object.values(map).filter((c:any) => c && c.path && c.path.startsWith('Artifacts/')).length
})

/**
 * 処理名: 最初の競合を開く
 */
function openFirstScopeConflict() {
  const proj = projectStore.selectedProject
  if (!proj) return
  const map = metadataStore.conflictData[proj] || {}
  const firstKey = Object.keys(map).find(k => map[k] && map[k].path && map[k].path.startsWith('Artifacts/'))
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

onMounted(() => {
    artifactStore.init();
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
 * 処理名: 編集開始
 * @param item 編集対象の `ArtifactType`
 *
 * 処理概要: フォームに対象データを読み込んで編集状態にする
 */
function onEdit(item: ArtifactType) {
  artifactStore.loadDraft(item);
}

/**
 * 処理名: 削除
 * @param item 削除対象の `ArtifactType`
 *
 * 処理概要: 確認ダイアログ後に作成物を削除し、フォームをクリアする
 */
async function onDelete(item: ArtifactType) {
  if(confirm(`作成物「${item.Name}」を削除しますか？`)) {
    await artifactStore.remove(item.ID);
    if(form.ID === item.ID) resetForm();
  }
}

/**
 * 処理名: フォーム送信
 *
 * 処理概要: 新規作成または更新を判定して永続化し、フォームをリセットする
 */
async function onSubmit() {
  if(!isValid.value) return;
  const existingId = form.ID || null
  if (isEditing.value) {
    const target = artifactStore.artifacts.find(i => i.ID === form.ID);
    if(target) {
      await artifactStore.update({
        ...target,
        Name: form.Name,
        Content: form.Content,
        Note: form.Note,
        CategoryID: form.CategoryID
      });
    }
  } else {
    await artifactStore.add({
      Name: form.Name,
      Content: form.Content,
      Note: form.Note,
      CategoryID: form.CategoryID
    });
  }
  resetForm();

  // Post-save: if this edit corresponded to a known conflict, attempt push then remove/sync
  await handlePostSave(projectStore.selectedProject, existingId, 'ArtifactView')
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
 * 処理名: フォームリセット
 *
 * 処理概要: フォームを初期状態に戻す
 */
function resetForm() {
  artifactStore.resetDraft();
}

// 競合解決ハンドラは未使用のため削除
</script>
