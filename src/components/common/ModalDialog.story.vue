<script setup lang="ts">
import { ref } from 'vue'
import ModalDialog from './ModalDialog.vue'
const open = ref(true)
</script>

<template>
  <Story title="Common/ModalDialog">
    <Variant title="Default">
      <button @click="open = true" class="mb-2 px-3 py-1 bg-blue-500 text-white rounded">ダイアログを開く</button>
      <ModalDialog v-model="open" title="確認ダイアログ">
        <p>ダイアログの本文コンテンツです。</p>
      </ModalDialog>
    </Variant>
  </Story>
</template>
