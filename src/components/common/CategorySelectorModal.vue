<template>
  <ModalDialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" title="カテゴリ選択">
    <div class="h-64 overflow-y-auto border rounded p-2">
      <div v-if="categoryStore.loading">Loading...</div>
      <div v-else-if="treeData.length === 0">カテゴリがありません</div>
      <CategoryTreeItem
        v-else
        v-for="node in treeData"
        :key="node.ID"
        :node="node"
        :selected-id="selectedId"
        :readonly="true"
        @select="onSelect"
      />
    </div>
    <template #footer>
      <button @click="$emit('update:modelValue', false)" class="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300">キャンセル</button>
      <button 
        @click="confirmSelection" 
        class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        :disabled="!selectedId"
      >
        選択
      </button>
    </template>
  </ModalDialog>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useCategoryStore, type CategoryNode } from '../../stores/categoryStore';
import ModalDialog from './ModalDialog.vue';
import CategoryTreeItem from '../category/CategoryTreeItem.vue';

defineProps<{
  modelValue: boolean;
  initialSelectedId?: string | null;
}>();

const emit = defineEmits(['update:modelValue', 'confirm'] as const);

const categoryStore = useCategoryStore();
const treeData = computed(() => categoryStore.getTree);
const selectedId = ref<string | null>(null);

/**
 * 処理名: ストア初期化ハンドラ
 *
 * 処理概要: コンポーネントのマウント時にカテゴリストアを初期化する
 */
function initStore() {
  categoryStore.init();
}

onMounted(initStore);

/**
 * 処理名: ノード選択ハンドラ
 * @param node 選択された `CategoryNode`
 *
 * 処理概要: 選択されたノードの ID を保持する
 */
function onSelect(node: CategoryNode) {
  selectedId.value = node.ID;
}

/**
 * 処理名: 選択確定
 *
 * 処理概要: 現在選択されているノードを検索して `confirm` イベントを発火する
 */
function confirmSelection() {
  if (selectedId.value) {
    /**
     * 処理名: ノード検索（再帰）
     * @param nodes 検索対象ノード配列
     * @returns CategoryNode | undefined 見つかったノードまたは undefined
     */
    const findNode = (nodes: CategoryNode[]): CategoryNode | undefined => {
      for (const node of nodes) {
        if (node.ID === selectedId.value) return node;
        if (node.children) {
          const found = findNode(node.children);
          if (found) return found;
        }
      }
      return undefined;
    };
    const node = findNode(treeData.value);
    if (node) {
      emit('confirm', node);
      emit('update:modelValue', false);
    }
  }
}
</script>
