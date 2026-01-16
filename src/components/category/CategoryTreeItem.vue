<template>
  <div class="pl-4">
    <div 
      class="flex items-center py-1 px-2 rounded cursor-pointer hover:bg-gray-100 group"
      :class="{ 'bg-blue-100': isSelected }"
      @click.stop="select(node)"
      :draggable="!readonly"
      @dragstart="onDragStart($event, node)"
      @dragover.prevent
      @drop.stop="onDrop($event, node)"
    >
      <div class="mr-2 text-gray-400">
        <Folder v-if="hasChildren" class="h-4 w-4 fill-current text-yellow-400" />
        <FolderIcon v-else class="h-4 w-4 text-gray-400" />
      </div>
      <span class="text-sm select-none">{{ node.Name }}</span>
      
      <!-- Actions (Visible on hover or selected) -->
      <div v-if="!readonly" class="ml-auto hidden group-hover:flex space-x-1">
        <button @click.stop="$emit('add-child', node)" class="p-1 hover:bg-gray-200 rounded" title="サブカテゴリ追加">
          <PlusCircle class="h-3 w-3 text-blue-500" />
        </button>
        <button @click.stop="$emit('delete', node)" class="p-1 hover:bg-gray-200 rounded" title="削除">
          <Trash2 class="h-3 w-3 text-red-500" />
        </button>
      </div>
    </div>

    <!-- Children -->
    <div v-if="hasChildren" class="border-l border-gray-200 ml-3">
      <CategoryTreeItem
        v-for="child in node.children"
        :key="child.ID"
        :node="child"
        :selected-id="selectedId"
        :readonly="readonly"
        @select="$emit('select', $event)"
        @add-child="$emit('add-child', $event)"
        @delete="$emit('delete', $event)"
        @move="$emit('move', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Folder, Folder as FolderIcon, PlusCircle, Trash2 } from 'lucide-vue-next';
import type { CategoryNode } from '../../stores/categoryStore';

const _props = defineProps<{
  node: CategoryNode;
  selectedId: string | null;
  readonly?: boolean;
}>();

const emit = defineEmits(['select', 'add-child', 'delete', 'move'] as const);

const isSelected = computed(() => _props.node.ID === _props.selectedId);
const hasChildren = computed(() => _props.node.children && _props.node.children.length > 0);

/**
 * 処理名: ノード選択
 * @param node 選択した `CategoryNode`
 *
 * 処理概要: ノードを選択状態にするためのイベントを発火する
 */
function select(node: CategoryNode) {
  emit('select', node);
}

/**
 * 処理名: ドラッグ開始
 * @param event 発生した `DragEvent`
 * @param node ドラッグ対象の `CategoryNode`
 *
 * 処理概要: ドラッグデータをセットして移動操作を開始する
 */
function onDragStart(event: DragEvent, node: CategoryNode) {
  if (_props.readonly) return;
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move';
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('application/json', JSON.stringify({ id: node.ID, name: node.Name }));
  }
}

/**
 * 処理名: ドロップ処理
 * @param event 発生した `DragEvent`
 * @param targetNode ドロップ先の `CategoryNode`
 *
 * 処理概要: ドロップされたデータを解析して移動イベントを発火する
 */
function onDrop(event: DragEvent, targetNode: CategoryNode) {
  const data = event.dataTransfer?.getData('application/json');
  if (data) {
    const { id } = JSON.parse(data);
    if (id !== targetNode.ID) { // 自分自身にはドロップできない
       emit('move', { draggedId: id, targetId: targetNode.ID });
    }
  }
}
</script>
