<script setup lang="ts">
import CategorySelector from './CategorySelector.vue'
</script>

<template>
  <Story title="Common/CategorySelector">
    <Variant title="パスあり">
      <CategorySelector path="root/プロジェクト/仕様" />
    </Variant>
    <Variant title="パスなし">
      <CategorySelector />
    </Variant>
  </Story>
</template>
