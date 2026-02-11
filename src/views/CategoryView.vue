<template>
  <div class="h-full flex flex-col">
    <div class="mb-4 flex items-center justify-between">
      <h2 class="text-xl font-bold">カテゴリ管理
        <span v-if="viewTabBadge > 0" class="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-600 text-white" :aria-label="`カテゴリタブの競合 ${viewTabBadge} 件`" tabindex="0" @click.prevent="openFirstScopeConflict" @keydown.enter.prevent="openFirstScopeConflict" @keydown.space.prevent="openFirstScopeConflict">{{ viewTabBadge }}</span>
      </h2>
      <button @click="addRootCategory" class="flex items-center space-x-1 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
        <PlusSquare class="h-4 w-4" />
        <span>ルートカテゴリ追加</span>
      </button>
    </div>

    <div class="flex-1 bg-white border rounded overflow-auto p-4">
      <h3 class="text-sm font-semibold text-gray-500 mb-2 border-b pb-1">カテゴリツリー</h3>
      
      <div v-if="categoryStore.loading" class="text-center text-gray-400 py-4">Loading...</div>
      
      <div v-else-if="treeData.length === 0" class="text-center text-gray-400 py-10">
        カテゴリがありません。右上のボタンからルートカテゴリを追加してください。
      </div>

      <div v-else>
         <CategoryTreeItem 
            v-for="node in treeData" 
            :key="node.ID" 
            :node="node" 
            :selected-id="selectedId"
            @select="onSelect"
            @add-child="onAddChild"
            @delete="onDelete"
          @move="onMove"
          @edit-request="onEditRequest"
         />
      </div>
    </div>

    <!-- Edit/Add Modal -->
    <ModalDialog v-model="showModal" :title="modalMode === 'create' ? 'カテゴリ作成' : 'カテゴリ編集'">
      <div class="space-y-4">
         <div>
           <label class="block text-sm font-medium text-gray-700">名称</label>
           <input
             v-model="editingName"
             type="text"
             class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
             placeholder="カテゴリ名"
             @keydown.enter.prevent="confirmSave"
             @keydown.esc.prevent="showModal = false"
           />
         </div>
      </div>
      <template #footer>
        <button @click="showModal = false" class="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300">キャンセル</button>
        <button @click="confirmSave" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">保存</button>
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
import { useCategoryStore, type CategoryNode } from '../stores/categoryStore';
import { useProjectStore } from '../stores/projectStore';
import { useMetadataStore } from '../stores/metadataStore';
import { PlusSquare } from 'lucide-vue-next';
import CategoryTreeItem from '../components/category/CategoryTreeItem.vue';
import ModalDialog from '../components/common/ModalDialog.vue';
import ThreeWayCompareModal from '../components/common/ThreeWayCompareModal.vue';

const categoryStore = useCategoryStore();
const projectStore = useProjectStore();
const metadataStore = useMetadataStore();
const treeData = computed(() => categoryStore.getTree);

const selectedId = ref<string | null>(null);
const showModal = ref(false);
const modalMode = ref<'create' | 'edit'>('create');
const editingName = ref('');
const editingId = ref<string | null>(null);
const targetParentId = ref<string | null>(null);

onMounted(() => {
  categoryStore.init();
});

const showCompareModal = ref(false)
const compareKey = ref<string | null>(null)
const route = useRoute()

const viewTabBadge = computed(() => {
  const proj = projectStore.selectedProject
  if (!proj) return 0
  const map = metadataStore.conflictData[proj] || {}
  return Object.values(map).filter((c:any) => c && c.path && c.path.startsWith('CategoryMaster/')).length
})

function openFirstScopeConflict() {
  const proj = projectStore.selectedProject
  if (!proj) return
  const map = metadataStore.conflictData[proj] || {}
  const firstKey = Object.keys(map).find(k => map[k] && map[k].path && map[k].path.startsWith('CategoryMaster/'))
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
 * 処理名: ノード選択
 * @param node 選択された `CategoryNode`
 *
 * 処理概要: 選択ノードの ID を保持する
 */
function onSelect(node: CategoryNode) {
  selectedId.value = node.ID;
}

/**
 * 処理名: ルートカテゴリ追加開始
 *
 * 処理概要: モーダルを開いてルートカテゴリ作成モードにする
 */
function addRootCategory() {
  modalMode.value = 'create';
  editingName.value = '';
  targetParentId.value = null;
  showModal.value = true;
}

/**
 * 処理名: サブカテゴリ追加開始
 * @param node 親ノードとなる `CategoryNode`
 *
 * 処理概要: モーダルを開いて子カテゴリ作成モードにする
 */
function onAddChild(node: CategoryNode) {
  modalMode.value = 'create';
  editingName.value = '';
  targetParentId.value = node.ID;
  showModal.value = true;
}

/**
 * 処理名: 編集要求ハンドラ
 * @param node 編集対象の CategoryNode
 *
 * 処理概要: 編集モーダルを開き、既存名称を編集用フィールドへセットする
 */
function onEditRequest(node: CategoryNode) {
  modalMode.value = 'edit';
  editingId.value = node.ID;
  editingName.value = node.Name;
  targetParentId.value = node.ParentID ?? null;
  // open edit modal
  showModal.value = true;
  // if this node has a conflict, offer compare modal instead
  const map = metadataStore.conflictData[projectStore.selectedProject || ''] || {}
  if (map[node.ID] || Object.values(map).find((v:any)=>v && v.id === node.ID)) {
    openCompare(node.ID)
  }
}

/**
 * 処理名: カテゴリ削除
 * @param node 削除対象の `CategoryNode`
 *
 * 処理概要: 子要素がないか確認した上でカテゴリを削除する
 */
function onDelete(node: CategoryNode) {
  if (confirm(`カテゴリ「${node.Name}」を削除しますか？\n（子要素がある場合は削除できません）`)) {
    if (node.children && node.children.length > 0) {
      alert('子カテゴリが存在するため削除できません。');
      return;
    }
    categoryStore.remove(node.ID);
    if (selectedId.value === node.ID) selectedId.value = null;
  }
}

/**
 * 処理名: 保存確定
 *
 * 処理概要: 入力内容を検証して新規カテゴリを永続化する
 */
async function confirmSave() {
  if (!editingName.value) return;

  if (modalMode.value === 'create') {
    await categoryStore.add({
      Name: editingName.value,
      ParentID: targetParentId.value,
      Level: 0,
      Path: ''
    });
  } else if (modalMode.value === 'edit' && editingId.value) {
    const category = categoryStore.categories.find(c => c.ID === editingId.value);
    if (category) {
      await categoryStore.update({ ...category, Name: editingName.value });
    }
  }

  showModal.value = false;

  // Post-save: if editing an existing category, attempt push then remove/sync
  try {
    const proj = projectStore.selectedProject
    if (!proj) {
      console.info('プロジェクトが未選択のため同期をスキップしました')
      return
    }
    if (!editingId.value) return

    console.info(`同期後処理開始: project=${proj} id=${editingId.value}`)
    const entry = await metadataStore.getConflictFor(proj, editingId.value)
    if (!entry) return

    const cfg = await metadataStore.getRepoConfig(proj)
    if (entry.path && cfg) {
      try {
        const client = new RepositoryWorkerClient()
        const projHandle = await metadataStore.getProjectDirHandle(proj)
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
            await metadataStore.removeConflict(proj, editingId.value)
            console.info(`プッシュ成功・競合削除: id=${editingId.value}`)
            return
          }
        }
      } catch (e) {
        console.error('pushPathsToRemote でエラー、syncProject にフォールバックします', e)
      }
    }

    try {
      await metadataStore.removeConflict(proj, editingId.value)
      console.info(`競合削除成功: id=${editingId.value}`)
    } catch (err) {
      console.error(`競合削除失敗: id=${editingId.value}`, err)
    }
    try {
      await metadataStore.syncProject(proj)
      console.info(`同期成功: project=${proj}`)
    } catch (err) {
      console.error(`同期失敗: project=${proj}`, err)
    }
  } catch (e) {
    console.error('同期後処理で予期せぬエラー', e)
  }
}

/**
 * 処理名: ノード移動処理
 * @param {{draggedId: string, targetId: string}} param0 - 移動情報
 *
 * 処理概要: ドラッグで移動されたカテゴリの親 ID を更新する
 */
function onMove({ draggedId, targetId }: { draggedId: string; targetId: string }) {
  const category = categoryStore.categories.find(c => c.ID === draggedId);
  if (category) {
    categoryStore.update({
      ...category,
      ParentID: targetId
    });
  }
}

/**
 * 処理名: ノード名変更
 * @param {{id: string, name: string}} param0 - 変更対象のカテゴリIDと新名称
 *
 * 処理概要: ストアの update を呼んで名称を永続化する
 */
async function _onRename({ id, name }: { id: string; name: string }) {
  const category = categoryStore.categories.find(c => c.ID === id);
  if (!category) return;
  await categoryStore.update({ ...category, Name: name });
}
// 参照用（ビルド時の未使用エラー回避）
void _onRename;

// 競合解決ハンドラは未使用のため削除
</script>
