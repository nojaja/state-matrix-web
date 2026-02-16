<template>
  <div class="space-y-6">
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div class="lg:col-span-4">
        <!-- List Section -->
        <EntityListSection title="登録済作成物一覧" :columns="artifactListColumns" :rows="artifactListRows"
          :current-category-id="currentListCategoryId" :child-categories="listChildCategories"
          :breadcrumbs="listBreadcrumbs" :can-move-parent="canMoveParent"
          :show-conflict-dot="hasArtifactConflict" :show-resolve-button="hasArtifactConflict" @edit="onEditById"
          @resolve-conflict="openCompare" @delete="onDeleteById" @enter-category="enterCategory"
          @move-to-parent="moveToParentCategory" @navigate-breadcrumb="navigateBreadcrumb">
          <template #cell-name="{ row }">{{ row.name }}</template>
        </EntityListSection>
      </div>

      <div class="lg:col-span-8">
        <!-- Form Section -->
        <div class="bg-white p-6 rounded shadow">
          <h2 class="text-lg font-bold mb-4">作成物管理
            <span v-if="viewTabBadge > 0"
              class="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-600 text-white"
              :aria-label="`アーティファクトタブの競合 ${viewTabBadge} 件`" tabindex="0" @click.prevent="openFirstScopeConflict"
              @keydown.enter.prevent="openFirstScopeConflict" @keydown.space.prevent="openFirstScopeConflict">{{
              viewTabBadge }}</span>
          </h2>

          <CategorySelector :path="selectedCategoryPath" @open="openCategorySelector" />

          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700">名称</label>
            <input v-model="form.Name" type="text" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              placeholder="作成物名称" />
          </div>

          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700">内容</label>
            <textarea v-model="form.Content" rows="2"
              class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" placeholder="作成物の内容"></textarea>
          </div>

          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700">備考</label>
            <textarea v-model="form.Note" rows="2" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              placeholder="備考"></textarea>
          </div>

          <button @click="onSubmit"
            class="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 font-bold disabled:opacity-50"
            :disabled="!isValid">
            {{ isEditing ? '作成物を更新' : '作成物を追加' }}
          </button>
          <button v-if="isEditing" @click="resetForm"
            class="w-full mt-2 bg-gray-300 text-gray-700 py-1 rounded hover:bg-gray-400">
            キャンセル
          </button>
        </div>
      </div>
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
import EntityListSection from '../components/common/EntityListSection.vue';
import ModalDialog from '../components/common/ModalDialog.vue'
import ThreeWayCompareModal from '../components/common/ThreeWayCompareModal.vue'

const artifactStore = useArtifactStore();
const projectStore = useProjectStore();
const metadataStore = useMetadataStore();
const categoryStore = useCategoryStore();

const artifacts = computed(() => artifactStore.artifacts);
const categoryMap = computed(() => categoryStore.getMap);
const currentListCategoryId = ref<string | null>(null);
const artifactListColumns = [
  { key: 'name', label: '名称', cellClass: 'px-6 py-4 whitespace-nowrap' }
];
const artifactListRows = computed(() => artifacts.value.map(item => ({
  ID: item.ID,
  categoryId: item.CategoryID,
  name: item.Name
}))); 
const listChildCategories = computed(() => {
  return categoryStore.categories
    .filter(c => c.ParentID === currentListCategoryId.value)
    .map(c => ({ id: c.ID, name: c.Name, parentId: c.ParentID }));
});
const listBreadcrumbs = computed(() => {
  const crumbs: { name: string; path: string; categoryId: string | null; isRootPath: boolean }[] = [
    { name: 'ルート', path: '/', categoryId: null, isRootPath: true }
  ];
  if (!currentListCategoryId.value) return crumbs;

  const chain: { id: string; name: string }[] = [];
  let cursorId: string | null = currentListCategoryId.value;
  while (cursorId) {
    const node = categoryMap.value[cursorId] as { ID: string; Name: string; ParentID: string | null } | undefined;
    if (!node) break;
    chain.unshift({ id: node.ID, name: node.Name });
    cursorId = node.ParentID;
  }

  let path = '';
  for (const node of chain) {
    path = `${path}/${node.name}`;
    crumbs.push({
      name: node.name,
      path,
      categoryId: node.id,
      isRootPath: false
    });
  }
  return crumbs;
});
const canMoveParent = computed(() => {
  return currentListCategoryId.value !== null;
});

const form = artifactStore.draft as any;

const isEditing = computed(() => !!form.ID);
const {
  showCategorySelector,
  selectedCategoryPath,
  openCategorySelector,
  onCategorySelected
} = useCategorySelector({
  /**
  * 処理名: 現在カテゴリID取得
  * @returns 現在のカテゴリID
   */
  categoryId: () => form.CategoryID,
  /**
  * 処理名: カテゴリフルパス取得
   * @param categoryId
  * @returns カテゴリのフルパス
   */
  getFullPath: (categoryId: string) => categoryStore.getFullPath(categoryId),
  /**
   *
   * @param categoryId
   */
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
  return Object.values(map).filter((c: any) => c && c.path && c.path.startsWith('Artifacts/')).length
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

/**
 * 処理名: 作成物競合判定
 * @param id 作成物ID
 * @returns 競合がある場合 true
 */
function hasArtifactConflict(id: string): boolean {
  return !!metadataStore.conflictData?.[projectStore.selectedProject || '']?.[id];
}

/**
 * 処理名: 子カテゴリへ移動
 * @param categoryId 移動先カテゴリID
 */
function enterCategory(categoryId: string) {
  currentListCategoryId.value = categoryId;
}

/**
 * 処理名: 親カテゴリへ移動
 */
function moveToParentCategory() {
  if (!currentListCategoryId.value) return;
  currentListCategoryId.value = categoryMap.value[currentListCategoryId.value]?.ParentID ?? null;
}

/**
 * 処理名: パンくず移動
 * @param categoryId パンくずのカテゴリID
 */
function navigateBreadcrumb(categoryId: string | null) {
  currentListCategoryId.value = categoryId;
}

/**
 * 処理名: ID指定編集
 * @param id 作成物ID
 */
function onEditById(id: string) {
  const item = artifacts.value.find(artifact => artifact.ID === id);
  if (!item) return;
  onEdit(item);
}

/**
 * 処理名: ID指定削除
 * @param id 作成物ID
 */
async function onDeleteById(id: string) {
  const item = artifacts.value.find(artifact => artifact.ID === id);
  if (!item) return;
  await onDelete(item);
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
// getCategoryName removed: category display column is no longer used

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
  if (confirm(`作成物「${item.Name}」を削除しますか？`)) {
    await artifactStore.remove(item.ID);
    if (form.ID === item.ID) resetForm();
  }
}

/**
 * 処理名: フォーム送信
 *
 * 処理概要: 新規作成または更新を判定して永続化し、フォームをリセットする
 */
async function onSubmit() {
  if (!isValid.value) return;
  const existingId = form.ID || null
  if (isEditing.value) {
    const target = artifactStore.artifacts.find(i => i.ID === form.ID);
    if (target) {
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
