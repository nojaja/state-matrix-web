<template>
  <div class="space-y-6">
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div class="lg:col-span-4">
        <!-- List Section -->
        <EntityListSection title="登録済プロセス一覧" :columns="processListColumns" :rows="processListRows"
          :current-category-id="currentListCategoryId" :child-categories="listChildCategories"
          :breadcrumbs="listBreadcrumbs" :can-move-parent="canMoveParent"
          :create-entity-label="'新規プロセス追加'"
          :show-conflict-dot="hasProcessConflict" :show-resolve-button="hasProcessConflict" @edit="onEditById"
          @resolve-conflict="openCompare" @delete="onDeleteById" @enter-category="enterCategory"
          @move-to-parent="moveToParentCategory" @navigate-breadcrumb="navigateBreadcrumb"
          @create-category="onCreateCategory" @create-entity="onCreateEntity" @rename-category="onRenameCategory"
          @delete-category="onDeleteCategory">
          <template #cell-name="{ row }">{{ row.name }}</template>
        </EntityListSection>
      </div>

      <div class="lg:col-span-8 space-y-4">
        <!-- Form Section -->
        <div class="bg-white p-6 rounded shadow">
          <h2 class="text-lg font-bold mb-4">プロセス管理
            <span v-if="viewTabBadge > 0"
              class="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-600 text-white"
              :aria-label="`プロセスタブの競合 ${viewTabBadge} 件`" tabindex="0" @click.prevent="openFirstScopeConflict"
              @keydown.enter.prevent="openFirstScopeConflict" @keydown.space.prevent="openFirstScopeConflict">{{
              viewTabBadge }}</span>
          </h2>

          <CategorySelector :path="selectedCategoryPath" @open="openCategorySelector" />

          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700">工程名称</label>
            <input v-model="form.Name" type="text" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              placeholder="プロセス名称" />
          </div>

          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700">説明</label>
            <textarea v-model="form.Description" rows="3"
              class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" placeholder="プロセスの説明"></textarea>
          </div>

          <InputOutputDefinitionComponent ref="inputOutputDefinitionRef" :selected-process-id="form.Name"
            :relation-process-id="form.ID" :selected-process-name="form.Name ?? ''"
            :selected-process-description="form.Description ?? ''" :input-artifacts="inputArtifacts"
            :output-artifacts="outputArtifacts" :process-items="processItems" :artifact-items="artifactItems"
            :show-process-setting-button="false" @update:selected-process-id="onSelectedProcessIdUpdated"
            @update:input-artifacts="onUpdateInputArtifacts" @update:output-artifacts="onUpdateOutputArtifacts"
            @remove-artifact="onRemoveArtifact" />

          <button @click="onSubmit"
            class="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 font-bold disabled:opacity-50"
            :disabled="!isValid">
            {{ isEditing ? 'プロセスを更新' : 'プロセスを追加' }}
          </button>
          <button v-if="isEditing" @click="resetForm"
            class="w-full mt-2 bg-gray-300 text-gray-700 py-1 rounded hover:bg-gray-400">
            キャンセル
          </button>
        </div>

        <!-- Inline conflict field resolver for process edits -->
        <div v-if="isEditing && metadataStore.conflictData?.[projectStore.selectedProject || '']?.[form.ID]"
          class="mb-4 bg-yellow-50 p-3 rounded">
          <ConflictFields :keyId="form.ID" />
        </div>
      </div>
    </div>

    <CategorySelectorModal v-model="showCategorySelector" @confirm="onCategorySelected" />
    <ModalDialog v-model="showCategoryEditModal" :title="categoryModalMode === 'create' ? 'カテゴリ作成' : 'カテゴリ編集'">
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700">名称</label>
          <input v-model="categoryEditingName" type="text"
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
            placeholder="カテゴリ名" @keydown.enter.prevent="confirmCategorySave"
            @keydown.esc.prevent="showCategoryEditModal = false" />
        </div>
      </div>
      <template #footer>
        <button @click="showCategoryEditModal = false"
          class="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300">キャンセル</button>
        <button @click="confirmCategorySave" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">保存</button>
      </template>
    </ModalDialog>
    <ModalDialog v-model="showCompareModal" title="競合解消">
      <ThreeWayCompareModal :keyId="compareKey || ''" />
    </ModalDialog>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import RepositoryWorkerClient from '../lib/repositoryWorkerClient';
import { useProcessStore } from '../stores/processStore';
import { useCategoryStore } from '../stores/categoryStore';
import { useProjectStore } from '../stores/projectStore';
import { useMetadataStore } from '../stores/metadataStore';
import { useArtifactStore } from '../stores/artifactStore';
import { useEntityListNavigationStore } from '../stores/entityListNavigationStore';
import { useCategorySelector } from '../composables/useCategorySelector';
import type { ProcessType } from '../types/models';
import CategorySelectorModal from '../components/common/CategorySelectorModal.vue';
import CategorySelector from '../components/common/CategorySelector.vue';
import EntityListSection from '../components/common/EntityListSection.vue';
import ModalDialog from '../components/common/ModalDialog.vue'
import ThreeWayCompareModal from '../components/common/ThreeWayCompareModal.vue'
import ConflictFields from '../components/common/ConflictFields.vue'
import InputOutputDefinitionComponent from '../components/trigger/InputOutputDefinitionComponent.vue'

const processStore = useProcessStore();
const categoryStore = useCategoryStore();
const projectStore = useProjectStore();
const metadataStore = useMetadataStore();
const artifactStore = useArtifactStore();
const entityListNavigationStore = useEntityListNavigationStore();

const processes = computed(() => processStore.processes);
const categoryMap = computed(() => categoryStore.getMap);
const currentListCategoryId = computed(() => entityListNavigationStore.currentCategoryId);
const processListColumns = [
  { key: 'name', label: '工程名', cellClass: 'px-6 py-4 whitespace-nowrap' }
];
const processListRows = computed(() => processes.value.map(proc => ({
  ID: proc.ID,
  categoryId: proc.CategoryID,
  name: proc.Name
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

const form = processStore.draft as any;

const isEditing = computed(() => !!form.ID);

/**
 * 処理名: 現在カテゴリID取得
 * @returns 現在編集中のカテゴリID
 */
function getCurrentCategoryId(): string | null | undefined {
  return form.CategoryID;
}

/**
 * 処理名: カテゴリパス解決
 * @param categoryId カテゴリID
 * @returns カテゴリのフルパス
 */
function resolveCategoryPath(categoryId: string): string | null {
  return categoryStore.getFullPath(categoryId);
}

/**
 * 処理名: カテゴリID反映
 * @param categoryId カテゴリID
 */
function applyCategoryId(categoryId: string): void {
  processStore.setDraft({ CategoryID: categoryId });
}

const {
  showCategorySelector,
  selectedCategoryPath,
  openCategorySelector,
  onCategorySelected
} = useCategorySelector({
  categoryId: getCurrentCategoryId,
  getFullPath: resolveCategoryPath,
  applyCategoryId
});
const isValid = computed(() => form.Name && form.CategoryID);

const showCompareModal = ref(false)
const compareKey = ref<string | null>(null)
const route = useRoute()
const showCategoryEditModal = ref(false)
const categoryModalMode = ref<'create' | 'edit'>('create')
const categoryEditingName = ref('')
const categoryEditingId = ref<string | null>(null)
const categoryTargetParentId = ref<string | null>(null)

type InputOutputDefinitionExposed = {
  saveCausalRelations: Function;
};
const inputOutputDefinitionRef = ref<InputOutputDefinitionExposed | null>(null);

type InputArtifactDraft = {
  id: string;
  name: string;
};

type OutputArtifactDraft = {
  id: string;
  name: string;
  crud?: 'Create' | 'Update';
};

const inputArtifacts = ref<InputArtifactDraft[]>([]);
const outputArtifacts = ref<OutputArtifactDraft[]>([]);
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

const viewTabBadge = computed(() => {
  const proj = projectStore.selectedProject
  if (!proj) return 0
  const map = metadataStore.conflictData[proj] || {}
  return Object.values(map).filter((c: any) => c && c.path && c.path.startsWith('ProcessTypes/')).length
})

/**
 * 処理名: 最初の競合を開く
 */
function openFirstScopeConflict() {
  const proj = projectStore.selectedProject
  if (!proj) return
  const map = metadataStore.conflictData[proj] || {}
  const firstKey = Object.keys(map).find(k => map[k] && map[k].path && map[k].path.startsWith('ProcessTypes/'))
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
 * 処理名: プロセス競合判定
 * @param id プロセスID
 * @returns 競合がある場合 true
 */
function hasProcessConflict(id: string): boolean {
  return !!metadataStore.conflictData?.[projectStore.selectedProject || '']?.[id];
}

/**
 * 処理名: 子カテゴリへ移動
 * @param categoryId 移動先カテゴリID
 */
function enterCategory(categoryId: string) {
  entityListNavigationStore.setCurrentCategory(categoryId);
}

/**
 * 処理名: 親カテゴリへ移動
 */
function moveToParentCategory() {
  entityListNavigationStore.moveToParent(categoryStore.categories.map(c => ({ ID: c.ID, ParentID: c.ParentID })));
}

/**
 * 処理名: パンくず移動
 * @param categoryId パンくずのカテゴリID
 */
function navigateBreadcrumb(categoryId: string | null) {
  entityListNavigationStore.setCurrentCategory(categoryId);
}

/**
 * 処理名: カテゴリ作成開始
 * @param parentCategoryId 親カテゴリID
 */
function onCreateCategory(parentCategoryId: string | null) {
  categoryModalMode.value = 'create';
  categoryEditingName.value = '';
  categoryEditingId.value = null;
  categoryTargetParentId.value = parentCategoryId;
  showCategoryEditModal.value = true;
}

/**
 * 処理名: エンティティ作成開始
 * @param categoryId 現在カテゴリID
 */
function onCreateEntity(categoryId: string | null) {
  resetForm();
  if (categoryId) {
    processStore.setDraft({ CategoryID: categoryId });
  }
}

/**
 * 処理名: カテゴリ名称変更開始
 * @param categoryId カテゴリID
 */
function onRenameCategory(categoryId: string) {
  const category = categoryStore.categories.find(c => c.ID === categoryId);
  if (!category) return;
  categoryModalMode.value = 'edit';
  categoryEditingId.value = category.ID;
  categoryEditingName.value = category.Name;
  categoryTargetParentId.value = category.ParentID ?? null;
  showCategoryEditModal.value = true;
}

/**
 * 処理名: カテゴリ削除
 * @param categoryId カテゴリID
 */
async function onDeleteCategory(categoryId: string) {
  const category = categoryStore.categories.find(c => c.ID === categoryId);
  if (!category) return;
  if (confirm(`カテゴリ「${category.Name}」を削除しますか？\n（子要素がある場合は削除できません）`)) {
    const hasChildren = categoryStore.categories.some(c => c.ParentID === categoryId);
    if (hasChildren) {
      alert('子カテゴリが存在するため削除できません。');
      return;
    }
    await categoryStore.remove(categoryId);
    if (currentListCategoryId.value === categoryId) {
      entityListNavigationStore.setCurrentCategory(category.ParentID ?? null);
    }
  }
}

/**
 * 処理名: カテゴリ保存確定
 */
async function confirmCategorySave() {
  if (!categoryEditingName.value) return;

  if (categoryModalMode.value === 'create') {
    await categoryStore.add({
      Name: categoryEditingName.value,
      ParentID: categoryTargetParentId.value,
      Level: 0,
      Path: ''
    });
  } else if (categoryModalMode.value === 'edit' && categoryEditingId.value) {
    const category = categoryStore.categories.find(c => c.ID === categoryEditingId.value);
    if (category) {
      await categoryStore.update({ ...category, Name: categoryEditingName.value });
    }
  }

  showCategoryEditModal.value = false;
}

/**
 * 処理名: ID指定編集
 * @param id プロセスID
 */
function onEditById(id: string) {
  const proc = processes.value.find(processItem => processItem.ID === id);
  if (!proc) return;
  onEdit(proc);
}

/**
 * 処理名: ID指定削除
 * @param id プロセスID
 */
async function onDeleteById(id: string) {
  const proc = processes.value.find(processItem => processItem.ID === id);
  if (!proc) return;
  await onDelete(proc);
}

onMounted(() => {
  entityListNavigationStore.ensureInitialRoot();
  processStore.init();
  categoryStore.init();
  artifactStore.init();
});

/**
 *
 * @param processId
 */
function onSelectedProcessIdUpdated(processId: string) {
  form.Name = processId;
}

/**
 *
 * @param value
 */
function onUpdateInputArtifacts(value: InputArtifactDraft[]) {
  inputArtifacts.value = value;
}

/**
 *
 * @param value
 */
function onUpdateOutputArtifacts(value: OutputArtifactDraft[]) {
  outputArtifacts.value = value;
}

/**
 *
 * @param payload
 * @param payload.index
 * @param payload.mode
 */
function onRemoveArtifact(payload: { index: number; mode: 'input' | 'output' }) {
  if (payload.mode === 'input') {
    inputArtifacts.value = inputArtifacts.value.filter((_, idx) => idx !== payload.index);
    return;
  }
  outputArtifacts.value = outputArtifacts.value.filter((_, idx) => idx !== payload.index);
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
  if (confirm(`プロセス「${proc.Name}」を削除しますか？`)) {
    await processStore.remove(proc.ID);
    if (form.ID === proc.ID) resetForm();
  }
}

/**
 * 処理名: フォーム送信
 *
 * 処理概要: 新規作成または更新を判定して永続化し、フォームをリセットする
 */
async function onSubmit() {
  if (!isValid.value) return;

  let savedProcessId = '';

  if (isEditing.value) {
    // Update
    const target = processStore.processes.find(p => p.ID === form.ID);
    if (target) {
      await processStore.update({
        ...target,
        Name: form.Name,
        Description: form.Description,
        CategoryID: form.CategoryID
      });
      savedProcessId = target.ID;
    }
  } else {
    // Add
    const added = await processStore.add({
      Name: form.Name,
      Description: form.Description,
      CategoryID: form.CategoryID
    });
    savedProcessId = added?.processId ?? '';
  }

  if (savedProcessId && inputOutputDefinitionRef.value) {
    await inputOutputDefinitionRef.value.saveCausalRelations({
      processTypeId: savedProcessId,
      triggerId: ''
    });
  }

  resetForm();

  // Post-save: remove conflict and sync
  await handlePostSave(projectStore.selectedProject, isEditing.value ? form.ID : null, 'ProcessView')
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
  processStore.resetDraft();
}

// 競合解決ハンドラは未使用のため削除
</script>
