<template>
  <ModalDialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" :title="title">
    <div class="mb-2">
       <input v-model="searchQuery" type="text" class="w-full border rounded p-2" placeholder="検索..." />
    </div>
    <div class="h-64 overflow-y-auto border rounded p-2">
      <div v-if="items.length === 0" class="text-gray-500 text-center py-4">データがありません</div>
      <div 
        v-for="item in filteredItems" 
        :key="item.id"
        class="p-2 cursor-pointer hover:bg-gray-100 rounded flex justify-between items-center"
        :class="{'bg-blue-100': selectedId === item.id}"
        @click="selectedId = item.id"
      >
        <span>{{ item.name }}</span>
        <span class="text-xs text-gray-500">{{ item.description }}</span>
      </div>
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
import { ref, computed, watch, onBeforeUnmount } from 'vue';
import ModalDialog from './ModalDialog.vue';

interface Item {
    id: string;
    name: string;
    description?: string;
    categoryName?: string;
}

const _props = defineProps<{
  modelValue: boolean;
  title: string;
  items: Item[];
}>();

const emit = defineEmits(['update:modelValue', 'confirm'] as const);

const searchQuery = ref('');
const selectedId = ref<string | null>(null);

const filteredItems = computed(() => {
    if(!searchQuery.value) return _props.items;
    const lower = searchQuery.value.toLowerCase();
    return _props.items.filter(i => 
        i.name.toLowerCase().includes(lower) || 
        (i.description && i.description.toLowerCase().includes(lower))
    );
});
  watch(() => _props.modelValue, (val) => {
    if(val) {
      selectedId.value = null;
      searchQuery.value = '';
    }
  });

/**
 * 処理名: キーダウンイベントハンドラ
 *
 * 処理概要: Enter/Escape のキーに応じて選択確定またはモーダルを閉じる
 * @param e キーイベント
 */
function onKeydown(e: KeyboardEvent) {
  if(e.key === 'Enter') {
    if(selectedId.value) confirmSelection();
  } else if(e.key === 'Escape') {
    emit('update:modelValue', false);
  }
}

watch(() => _props.modelValue, (val) => {
  if(val) {
    window.addEventListener('keydown', onKeydown);
  } else {
    window.removeEventListener('keydown', onKeydown);
  }
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown);
});

/**
 * 処理名: 選択確定
 *
 * 処理概要: 現在選択されている項目を検索して `confirm` イベントを発火する
 */
function confirmSelection() {
  const item = _props.items.find(i => i.id === selectedId.value);
  if(item) {
    emit('confirm', item);
    emit('update:modelValue', false);
  }
}
</script>
