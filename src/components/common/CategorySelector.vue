<template>
  <div class="mb-4">
    <label class="block text-sm font-medium text-gray-700">カテゴリ : </label>
    <div class="mt-1 flex items-center">
      <button @click="$emit('open')" class="text-blue-600 hover:underline flex items-center">
        <span v-if="path">{{ path }}</span>
        <span v-else class="text-gray-400">（カテゴリを選択してください）</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ path?: string | null }>();
defineEmits(['open'] as const);
</script>
