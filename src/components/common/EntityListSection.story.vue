<script setup lang="ts">
import EntityListSection from './EntityListSection.vue'

const title = 'プロジェクト一覧'
const columns = [
  { key: 'name', label: '名前' },
  { key: 'created', label: '作成日' }
]
const rows = [
  { id: '1', name: '要件定義', created: '2026-02-01' },
  { id: '2', name: '設計書', created: '2026-02-10' }
]
</script>

<template>
  <Story title="Common/EntityListSection">
    <Variant title="Default">
      <EntityListSection :title="title" :columns="columns" :rows="rows" />
    </Variant>
    <Variant title="Empty">
      <EntityListSection title="空の一覧" :columns="columns" :rows="[]" empty-message="データがありません" />
    </Variant>
  </Story>
</template>
