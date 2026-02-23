<script setup lang="ts">
import { ref } from 'vue'
import RepoSettingsModal from './RepoSettingsModal.vue'
const open = ref(true)
</script>

<template>
  <Story title="Common/RepoSettingsModal">
    <Variant title="Default">
      <button @click="open = true" class="mb-2 px-3 py-1 bg-blue-500 text-white rounded">設定を開く</button>
      <RepoSettingsModal v-model="open" />
    </Variant>
  </Story>
</template>
