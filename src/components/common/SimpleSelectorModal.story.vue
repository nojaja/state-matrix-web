<script setup lang="ts">
import { ref } from 'vue'
import SimpleSelectorModal from './SimpleSelectorModal.vue'

const open = ref(true)
const items = [
  { id: '1', name: '選択肢A', description: '説明A' },
  { id: '2', name: '選択肢B', description: '説明B' },
  { id: '3', name: '選択肢C' }
]
</script>

<template>
  <Story title="Common/SimpleSelectorModal">
    <Variant title="Default">
      <button @click="open = true" class="mb-2 px-3 py-1 bg-blue-500 text-white rounded">セレクタを開く</button>
      <SimpleSelectorModal v-model="open" title="選択ダイアログ" :items="items" />
    </Variant>
  </Story>
</template>
