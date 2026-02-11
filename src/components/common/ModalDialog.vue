<template>
  <div v-if="modelValue" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 overflow-y-auto">
    <div class="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
      <div class="flex justify-between items-center p-4 border-b">
        <h3 class="text-lg font-semibold">{{ title }}</h3>
        <button @click="$emit('update:modelValue', false)" class="text-gray-500 hover:text-gray-700">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div class="p-4">
        <slot></slot>
      </div>
      <div class="p-4 border-t bg-gray-50 flex justify-end space-x-2 rounded-b-lg">
        <slot name="footer">
          <button @click="$emit('update:modelValue', false)" class="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300">
            閉じる
          </button>
        </slot>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * ModalDialog コンポーネント
 * - modelValue: ダイアログ表示状態
 * - title: ダイアログタイトル
 */
defineProps<{
  modelValue: boolean;
  title: string;
}>();

/**
 * ダイアログ表示状態変更イベント
 */
defineEmits<{
  'update:modelValue': [value: boolean];
}>();
</script>
