<script setup lang="ts">
import CategoryTreeItem from './CategoryTreeItem.vue'
import type { CategoryNode } from '../../stores/categoryStore'

const node: CategoryNode = {
  ID: 'root',
  Name: 'ルートカテゴリ',
  ParentID: '',
  Level: 0,
  Path: '/root',
  children: [
    { ID: 'child1', Name: '子カテゴリ1', ParentID: 'root', Level: 1, Path: '/root/child1', children: [] },
    {
      ID: 'child2',
      Name: '子カテゴリ2',
      ParentID: 'root',
      Level: 1,
      Path: '/root/child2',
      children: [
        { ID: 'grandchild1', Name: '孫カテゴリ1', ParentID: 'child2', Level: 2, Path: '/root/child2/grandchild1', children: [] }
      ]
    }
  ]
}
</script>

<template>
  <Story title="Category/CategoryTreeItem">
    <Variant title="Default">
      <CategoryTreeItem :node="node" :selected-id="null" />
    </Variant>
    <Variant title="Readonly">
      <CategoryTreeItem :node="node" :selected-id="'child1'" :readonly="true" />
    </Variant>
  </Story>
</template>
