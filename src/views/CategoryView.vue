<template>
  <div class="h-full flex flex-col">
    <div class="mb-4 flex items-center justify-between">
      <h2 class="text-xl font-bold">カテゴリ管理</h2>
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
         />
      </div>
    </div>

    <!-- Edit/Add Modal -->
    <ModalDialog v-model="showModal" :title="modalMode === 'create' ? 'カテゴリ作成' : 'カテゴリ編集'">
      <div class="space-y-4">
         <div>
           <label class="block text-sm font-medium text-gray-700">名称</label>
           <input v-model="editingName" type="text" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border" placeholder="カテゴリ名" />
         </div>
      </div>
      <template #footer>
        <button @click="showModal = false" class="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300">キャンセル</button>
        <button @click="confirmSave" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">保存</button>
      </template>
    </ModalDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useCategoryStore, type CategoryNode } from '../stores/categoryStore';
import { PlusSquare } from 'lucide-vue-next';
import CategoryTreeItem from '../components/category/CategoryTreeItem.vue';
import ModalDialog from '../components/common/ModalDialog.vue';

const categoryStore = useCategoryStore();
const treeData = computed(() => categoryStore.getTree);

const selectedId = ref<string | null>(null);
const showModal = ref(false);
const modalMode = ref<'create' | 'edit'>('create');
const editingName = ref('');
const targetParentId = ref<string | null>(null);

onMounted(() => {
  categoryStore.init();
});

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
  } 
  
  showModal.value = false;
}

/**
 * 処理名: ノード移動処理
 * @param param0.draggedId 移動元のカテゴリ ID
 * @param param0.targetId 移動先のカテゴリ ID
 * @param root0 互換用パラメタ名
 * @param root0.draggedId 互換用移動元 ID
 * @param root0.targetId 互換用移動先 ID
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
</script>
